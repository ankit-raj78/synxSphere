#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SyncSphereSimpleStack } from '../lib/syncsphere-simple-stack';

const app = new cdk.App();

new SyncSphereSimpleStack(app, 'SyncSphereSimpleStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  },
  description: 'SyncSphere Simple EC2 Deployment - Minimal Cost',
  tags: {
    Project: 'SyncSphere',
    Environment: process.env.ENVIRONMENT ?? 'production',
    Owner: 'SyncSphere Team',
    CostOptimized: 'true',
  },
});
