#!/usr/bin/env node
/*
 * Copyright © 2019 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// tslint:disable

/**
 * Main entry point script. Added as a binary in package.json
 */

import { FileSystemProjectAnalysisResultStore } from "../analysis/offline/persist/FileSystemProjectAnalysisResultStore";
import { GitHubSpider } from "../analysis/offline/spider/github/GitHubSpider";
import { Spider } from "../analysis/offline/spider/Spider";
import { createAnalyzer } from "../machine/machine";
import {
    configureLogging,
    MinimalLogging,
} from "@atomist/automation-client";
import { firstSubprojectFinderOf } from "../analysis/subprojectFinder";
import { fileNamesSubprojectFinder } from "../analysis/fileNamesSubprojectFinder";
import * as boxen from "boxen";

// Ensure we see console logging, and send info to the console
configureLogging(MinimalLogging);

/**
 * Spider a GitHub.com org
 */
async function spider(org: string) {
    const analyzer = createAnalyzer(undefined);

    const spider: Spider = new GitHubSpider();
    const persister = new FileSystemProjectAnalysisResultStore();

    const result = await spider.spider({
        // See the GitHub search API documentation at
        // https://developer.github.com/v3/search/
        // You can query for many other things here, beyond org
        githubQueries: [`org:${org} cognitive in:name`],

        maxRetrieved: 1500,
        maxReturned: 1500,
        projectTest: async p => {
            // Perform a computation here to return false if a project should not
            // be analyzed and persisted, based on its contents. For example,
            // this enables you to analyze only projects containing a particular file
            // through calling getFile()
            return true;
        },
        subprojectFinder: firstSubprojectFinderOf(
            fileNamesSubprojectFinder("pom.xml", "build.gradle", "package.json"),
        ),
    },
        analyzer,
        {
            persister,
            keepExistingPersisted: async existing => {
                console.log(`\tAnalyzing ${existing.analysis.id.url}`);

                // Perform a computation here to return true if an existing analysis seems valid
                return false;
            },
            // Controls promise usage inNode
            poolSize: 40,
        });
    return result;
}

if (process.argv.length < 3) {
    console.log("Usage: spider <GitHub organization>");
    console.log("Example:");
    console.log("spider atomist");
    process.exit(1);
}

const org = process.argv[2];
console.log(`Spidering GitHub organization ${org}...`);
spider(org).then(r => {
    console.log(boxen(`Successfully analyzed GitHub organization ${org}. result is ` + JSON.stringify(r),
        { padding: 2 }));
}, err => {
    console.log("Oh no! " + err.message);
});
