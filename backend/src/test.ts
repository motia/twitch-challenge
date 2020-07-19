import 'source-map-support/register';
import * as dotEnv from 'dotenv';
import * as path from 'path';

process.env.NODE_ENV = 'test';

dotEnv.config({ path: path.join(__dirname, '..', '.env.test') });
