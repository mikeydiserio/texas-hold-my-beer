import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./e2e',timeout:90000,workers:1,use:{baseURL:process.env.TEST_URL||'http://localhost:3000',headless:true,viewport:{width:1440,height:950},launchOptions:{args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']},screenshot:'only-on-failure'},outputDir:'artifacts/playwright',reporter:'list'});
