import pg from 'pg';import {mkdtempSync,rmSync} from 'node:fs';import os from 'node:os';import path from 'node:path';import {checkDomain} from './check-domain.mjs';
const value=process.env.TEST_DATABASE_URL;if(!value)throw Error('TEST_DATABASE_URL must name a disposable local database');
const url=new URL(value);if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw Error('PostgreSQL test is local only');
pg.types.setTypeParser(1082,v=>v);const client=new pg.Client({connectionString:value});await client.connect();
const schema='quality_test_'+process.pid+'_'+Date.now(),temp=mkdtempSync(path.join(os.tmpdir(),'quality-pg-'));
const db={query:async(s,p=[])=>(await client.query(s,p)).rows,exec:s=>client.query(s)};
try{await client.query(`create schema ${schema}`);await client.query(`set search_path to ${schema},public`);console.log('PASS PostgreSQL '+await checkDomain(db,temp)+' integration groups');}
finally{await client.query('reset search_path');await client.query(`drop schema if exists ${schema} cascade`);await client.end();rmSync(temp,{recursive:true,force:true});}
