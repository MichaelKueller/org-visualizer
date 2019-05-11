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

import { InMemoryProject } from "@atomist/automation-client";
import * as assert from "assert";
import { GradleSubprojectFinder } from "../../lib/analysis/gradleSubprojectFinder";
import { SubprojectStatus } from "../../lib/analysis/subprojectFinder";

describe("gradleSubprojectFinder", () => {
    it("says this is a top-level project if there's a build.gradle at root", async () => {
        const project = InMemoryProject.of({ path: "build.gradle", content: "whatever" });
        const result = await GradleSubprojectFinder(project);
        assert.deepStrictEqual(result, {
            status: SubprojectStatus.RootOnly,
        });
    });

    it("says this is unknown if there's no build.gradle at all", async () => {
        const project = InMemoryProject.of({ path: "something/else", content: "whatever" });
        const result = await GradleSubprojectFinder(project);
        assert.deepStrictEqual(result, {
            status: SubprojectStatus.Unknown,
        });
    });

    it("finds multiple projects if there is no root build.gradle but some down in dirs", async () => {
        const project = InMemoryProject.of(
            { path: "something/else/build.gradle", content: "whatever" },
            { path: "somewhere/build.gradle", content: "stuff" });
        const result = await GradleSubprojectFinder(project);
        assert.deepStrictEqual(result, {
            status: SubprojectStatus.IdentifiedPaths,
            paths: ["something/else", "somewhere"],
        });
    });

    it("ignores deeper build.gradles if one exists at root", async () => {
        const project = InMemoryProject.of(
            { path: "something/else/build.gradle", content: "whatever" },
            { path: "build.gradle", content: "stuff" },
        );
        const result = await GradleSubprojectFinder(project);
        assert.deepStrictEqual(result, {
            status: SubprojectStatus.RootOnly,
        });
    });
});
