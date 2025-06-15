#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SyncSphereStack } from '../lib/syncsphere-stack';

const app = new cdk.App();

new SyncSphereStack(app, 'SyncSphereStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'SyncSphere Audio Collaboration Platform Infrastructure',
  tags: {
    Project: 'SyncSphere',
    Environment: process.env.ENVIRONMENT || 'production',
    Owner: 'SyncSphere Team',
  },
});
