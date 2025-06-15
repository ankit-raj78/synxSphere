# AWS Infrastructure as Code using AWS CDK
# This file sets up the complete AWS infrastructure for SyncSphere

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import { Construct } from 'constructs';

export class SyncSphereStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC for all resources
    const vpc = new ec2.Vpc(this, 'SyncSphereVPC', {
      maxAzs: 2,
      enableDnsHostnames: true,
      enableDnsSupport: true,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 28,
          name: 'isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // Security Groups
    const albSecurityGroup = new ec2.SecurityGroup(this, 'ALBSecurityGroup', {
      vpc,
      description: 'Security group for Application Load Balancer',
      allowAllOutbound: true,
    });
    albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'HTTP access');
    albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'HTTPS access');

    const ecsSecurityGroup = new ec2.SecurityGroup(this, 'ECSSecurityGroup', {
      vpc,
      description: 'Security group for ECS tasks',
      allowAllOutbound: true,
    });
    ecsSecurityGroup.addIngressRule(albSecurityGroup, ec2.Port.tcp(3000), 'Allow ALB to ECS');

    const rdsSecurityGroup = new ec2.SecurityGroup(this, 'RDSSecurityGroup', {
      vpc,
      description: 'Security group for RDS PostgreSQL',
      allowAllOutbound: false,
    });
    rdsSecurityGroup.addIngressRule(ecsSecurityGroup, ec2.Port.tcp(5432), 'Allow ECS to RDS');

    const redisSecurityGroup = new ec2.SecurityGroup(this, 'RedisSecurityGroup', {
      vpc,
      description: 'Security group for Redis ElastiCache',
      allowAllOutbound: false,
    });
    redisSecurityGroup.addIngressRule(ecsSecurityGroup, ec2.Port.tcp(6379), 'Allow ECS to Redis');

    // S3 Bucket for audio files storage
    const audioFilesBucket = new s3.Bucket(this, 'AudioFilesBucket', {
      bucketName: `syncsphere-audio-files-${this.account}-${this.region}`,
      versioned: false,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      cors: [
        {
          allowedHeaders: ['*'],
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
          allowedOrigins: ['*'], // Configure with your domain in production
          maxAge: 300,
        },
      ],
    });

    // S3 Bucket for compositions/mixed files
    const compositionsBucket = new s3.Bucket(this, 'CompositionsBucket', {
      bucketName: `syncsphere-compositions-${this.account}-${this.region}`,
      versioned: false,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // CloudFront Distribution for static assets
    const distribution = new cloudfront.Distribution(this, 'SyncSphereDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(audioFilesBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      additionalBehaviors: {
        '/compositions/*': {
          origin: new origins.S3Origin(compositionsBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
      },
    });

    // Database credentials secret
    const dbCredentials = new secretsmanager.Secret(this, 'DBCredentials', {
      description: 'Credentials for SyncSphere PostgreSQL database',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'syncsphere' }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\',
        passwordLength: 32,
      },
    });

    // RDS PostgreSQL Instance
    const database = new rds.DatabaseInstance(this, 'SyncSphereDatabase', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_4,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      credentials: rds.Credentials.fromSecret(dbCredentials),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [rdsSecurityGroup],
      databaseName: 'syncsphere',
      backupRetention: cdk.Duration.days(7),
      deleteAutomatedBackups: false,
      deletionProtection: true,
      multiAz: false, // Set to true for production
      allocatedStorage: 20,
      storageEncrypted: true,
      monitoringInterval: cdk.Duration.seconds(60),
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ElastiCache Redis Subnet Group
    const redisSubnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
      description: 'Subnet group for Redis cache',
      subnetIds: vpc.isolatedSubnets.map(subnet => subnet.subnetId),
    });

    // ElastiCache Redis Cluster
    const redisCluster = new elasticache.CfnCacheCluster(this, 'RedisCluster', {
      cacheNodeType: 'cache.t3.micro',
      engine: 'redis',
      numCacheNodes: 1,
      port: 6379,
      vpcSecurityGroupIds: [redisSecurityGroup.securityGroupId],
      cacheSubnetGroupName: redisSubnetGroup.ref,
    });

    // ECR Repository
    const repository = new ecr.Repository(this, 'SyncSphereRepo', {
      repositoryName: 'syncsphere',
      imageScanOnPush: true,
      imageTagMutability: ecr.TagMutability.MUTABLE,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'SyncSphereCluster', {
      vpc,
      clusterName: 'syncsphere-cluster',
    });

    // Application Load Balancer
    const alb = new elbv2.ApplicationLoadBalancer(this, 'SyncSphereALB', {
      vpc,
      internetFacing: true,
      securityGroup: albSecurityGroup,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
    });

    // Target Group
    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'SyncSphereTargetGroup', {
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      vpc,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        enabled: true,
        path: '/api/health',
        protocol: elbv2.Protocol.HTTP,
        healthyHttpCodes: '200',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
    });

    // ALB Listener
    const listener = alb.addListener('SyncSphereListener', {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultTargetGroups: [targetGroup],
    });

    // Task Definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'SyncSphereTaskDef', {
      memoryLimitMiB: 1024,
      cpu: 512,
    });

    // Grant S3 permissions to task role
    audioFilesBucket.grantReadWrite(taskDefinition.taskRole);
    compositionsBucket.grantReadWrite(taskDefinition.taskRole);

    // Grant Secrets Manager access
    dbCredentials.grantRead(taskDefinition.taskRole);

    // Log Group
    const logGroup = new logs.LogGroup(this, 'SyncSphereLogGroup', {
      logGroupName: '/ecs/syncsphere',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Container Definition
    const container = taskDefinition.addContainer('syncsphere-app', {
      image: ecs.ContainerImage.fromEcrRepository(repository, 'latest'),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'syncsphere',
        logGroup,
      }),
      environment: {
        NODE_ENV: 'production',
        PORT: '3000',
        AWS_REGION: this.region,
        S3_AUDIO_BUCKET: audioFilesBucket.bucketName,
        S3_COMPOSITIONS_BUCKET: compositionsBucket.bucketName,
        CLOUDFRONT_DOMAIN: distribution.distributionDomainName,
        REDIS_HOST: redisCluster.attrRedisEndpointAddress,
        REDIS_PORT: '6379',
      },
      secrets: {
        DB_HOST: ecs.Secret.fromSecretsManager(dbCredentials, 'host'),
        DB_PORT: ecs.Secret.fromSecretsManager(dbCredentials, 'port'),
        DB_NAME: ecs.Secret.fromSecretsManager(dbCredentials, 'dbname'),
        DB_USER: ecs.Secret.fromSecretsManager(dbCredentials, 'username'),
        DB_PASSWORD: ecs.Secret.fromSecretsManager(dbCredentials, 'password'),
      },
      portMappings: [
        {
          containerPort: 3000,
          protocol: ecs.Protocol.TCP,
        },
      ],
    });

    // ECS Service
    const service = new ecs.FargateService(this, 'SyncSphereService', {
      cluster,
      taskDefinition,
      desiredCount: 1, // Start with 1, scale as needed
      assignPublicIp: false,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [ecsSecurityGroup],
    });

    // Attach service to target group
    service.attachToApplicationTargetGroup(targetGroup);

    // Auto Scaling
    const scaling = service.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 10,
    });

    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(300),
      scaleOutCooldown: cdk.Duration.seconds(300),
    });

    scaling.scaleOnMemoryUtilization('MemoryScaling', {
      targetUtilizationPercent: 80,
      scaleInCooldown: cdk.Duration.seconds(300),
      scaleOutCooldown: cdk.Duration.seconds(300),
    });

    // Store important values in SSM Parameter Store
    new ssm.StringParameter(this, 'ALBEndpoint', {
      parameterName: '/syncsphere/alb-endpoint',
      stringValue: alb.loadBalancerDnsName,
      description: 'Application Load Balancer endpoint',
    });

    new ssm.StringParameter(this, 'ECRRepositoryURI', {
      parameterName: '/syncsphere/ecr-repository-uri',
      stringValue: repository.repositoryUri,
      description: 'ECR Repository URI',
    });

    new ssm.StringParameter(this, 'CloudFrontDomain', {
      parameterName: '/syncsphere/cloudfront-domain',
      stringValue: distribution.distributionDomainName,
      description: 'CloudFront distribution domain',
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApplicationURL', {
      value: `http://${alb.loadBalancerDnsName}`,
      description: 'Application Load Balancer URL',
    });

    new cdk.CfnOutput(this, 'ECRRepositoryURI', {
      value: repository.repositoryUri,
      description: 'ECR Repository URI for pushing Docker images',
    });

    new cdk.CfnOutput(this, 'CloudFrontURL', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront distribution URL for static assets',
    });

    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: database.instanceEndpoint.hostname,
      description: 'RDS PostgreSQL endpoint',
    });
  }
}
