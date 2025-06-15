// Simple EC2 AWS Infrastructure using CDK
// Minimal cost deployment for SyncSphere

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class SyncSphereSimpleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Use default VPC to avoid extra costs
    const vpc = ec2.Vpc.fromLookup(this, 'DefaultVPC', {
      isDefault: true,
    });

    // Security Group for EC2 instance
    const ec2SecurityGroup = new ec2.SecurityGroup(this, 'EC2SecurityGroup', {
      vpc,
      description: 'Security group for SyncSphere EC2 instance',
      allowAllOutbound: true,
    });

    // Allow HTTP and HTTPS access
    ec2SecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'HTTP access');
    ec2SecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'HTTPS access');
    ec2SecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(3000), 'App access');
    ec2SecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'SSH access');

    // Security Group for RDS
    const rdsSecurityGroup = new ec2.SecurityGroup(this, 'RDSSecurityGroup', {
      vpc,
      description: 'Security group for RDS PostgreSQL',
      allowAllOutbound: false,
    });
    rdsSecurityGroup.addIngressRule(ec2SecurityGroup, ec2.Port.tcp(5432), 'Allow EC2 to RDS');

    // S3 Bucket for audio files (minimal setup)
    const audioFilesBucket = new s3.Bucket(this, 'AudioFilesBucket', {
      bucketName: `syncsphere-audio-${this.account}-${this.region}`,
      versioned: false,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
      cors: [
        {
          allowedHeaders: ['*'],
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
          allowedOrigins: ['*'],
          maxAge: 300,
        },
      ],
    });

    // IAM Role for EC2 instance
    const ec2Role = new iam.Role(this, 'EC2Role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      description: 'IAM role for SyncSphere EC2 instance',
    });

    // Grant S3 permissions to EC2 role
    audioFilesBucket.grantReadWrite(ec2Role);    // Instance Profile for EC2
    const instanceProfile = new iam.CfnInstanceProfile(this, 'EC2InstanceProfile', {
      roles: [ec2Role.roleName],
    });

    // RDS Subnet Group (use default subnets)
    const dbSubnetGroup = new rds.SubnetGroup(this, 'DBSubnetGroup', {
      vpc,
      description: 'Subnet group for RDS database',
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC, // Use public subnets to avoid NAT costs
      },
    });

    // RDS PostgreSQL Instance (minimal configuration)
    const database = new rds.DatabaseInstance(this, 'SyncSphereDatabase', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_3,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),      credentials: rds.Credentials.fromGeneratedSecret('postgres'),
      vpc,
      subnetGroup: dbSubnetGroup,
      securityGroups: [rdsSecurityGroup],
      databaseName: 'syncsphere',
      backupRetention: cdk.Duration.days(1), // Minimal backup
      deleteAutomatedBackups: true,
      deletionProtection: false,
      multiAz: false,
      allocatedStorage: 20,
      storageEncrypted: false, // Disable to reduce costs
      publiclyAccessible: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
    });

    // Key Pair for EC2 access (you need to create this manually)
    const keyPairName = 'syncsphere-keypair';

    // User Data script for EC2 instance
    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      // Update system
      'yum update -y',
      'yum install -y docker git postgresql15',
      
      // Install Docker Compose
      'curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose',
      'chmod +x /usr/local/bin/docker-compose',
      
      // Start Docker
      'systemctl start docker',
      'systemctl enable docker',
      'usermod -a -G docker ec2-user',
      
      // Install Node.js
      'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash',
      'export NVM_DIR="$HOME/.nvm"',
      '[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"',
      'nvm install 18',
      'nvm use 18',
      
      // Set environment variables
      `echo 'export DB_HOST=${database.instanceEndpoint.hostname}' >> /home/ec2-user/.bashrc`,
      `echo 'export DB_PORT=5432' >> /home/ec2-user/.bashrc`,
      `echo 'export DB_NAME=syncsphere' >> /home/ec2-user/.bashrc`,
      `echo 'export DB_USER=postgres' >> /home/ec2-user/.bashrc`,
      `echo 'export AWS_REGION=${this.region}' >> /home/ec2-user/.bashrc`,
      `echo 'export S3_AUDIO_BUCKET=${audioFilesBucket.bucketName}' >> /home/ec2-user/.bashrc`,
      
      // Clone and setup application (you'll need to replace with your repo)
      'cd /home/ec2-user',
      'git clone https://github.com/yourusername/syncsphere.git',
      'cd syncsphere',
      'npm install',
      
      // Create systemd service for the application
      'cat > /etc/systemd/system/syncsphere.service << EOF',
      '[Unit]',
      'Description=SyncSphere Application',
      'After=network.target',
      '',
      '[Service]',
      'Type=simple',
      'User=ec2-user',
      'WorkingDirectory=/home/ec2-user/syncsphere',
      'Environment=NODE_ENV=production',
      'Environment=PORT=3000',
      `Environment=DB_HOST=${database.instanceEndpoint.hostname}`,
      'Environment=DB_PORT=5432',
      'Environment=DB_NAME=syncsphere',
      'Environment=DB_USER=postgres',
      `Environment=AWS_REGION=${this.region}`,
      `Environment=S3_AUDIO_BUCKET=${audioFilesBucket.bucketName}`,
      'ExecStart=/home/ec2-user/.nvm/versions/node/v18.*/bin/npm start',
      'Restart=always',
      'RestartSec=10',
      '',
      '[Install]',
      'WantedBy=multi-user.target',
      'EOF',
      
      // Enable and start the service
      'systemctl daemon-reload',
      'systemctl enable syncsphere',
      'chown -R ec2-user:ec2-user /home/ec2-user'
    );

    // EC2 Instance (t3.micro for free tier)
    const instance = new ec2.Instance(this, 'SyncSphereInstance', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2(),
      securityGroup: ec2SecurityGroup,
      keyName: keyPairName,
      userData,
      role: ec2Role,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
    });

    // Outputs
    new cdk.CfnOutput(this, 'InstancePublicIP', {
      value: instance.instancePublicIp,
      description: 'Public IP address of the EC2 instance',
    });

    new cdk.CfnOutput(this, 'ApplicationURL', {
      value: `http://${instance.instancePublicIp}:3000`,
      description: 'SyncSphere application URL',
    });

    new cdk.CfnOutput(this, 'SSHCommand', {
      value: `ssh -i ${keyPairName}.pem ec2-user@${instance.instancePublicIp}`,
      description: 'SSH command to connect to the instance',
    });

    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: database.instanceEndpoint.hostname,
      description: 'RDS PostgreSQL endpoint',
    });

    new cdk.CfnOutput(this, 'S3BucketName', {
      value: audioFilesBucket.bucketName,
      description: 'S3 bucket for audio files',
    });
  }
}
