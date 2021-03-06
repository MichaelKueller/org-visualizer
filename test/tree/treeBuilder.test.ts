import * as assert from "power-assert";
import { FileSystemProjectAnalysisResultStore } from "../../lib/analysis/offline/persist/FileSystemProjectAnalysisResultStore";
import { ProjectAnalysisResult } from "../../lib/analysis/ProjectAnalysisResult";
import { DefaultProjectAnalysisResultRenderer } from "../../lib/routes/projectAnalysisResultUtils";
import { treeBuilder } from "../../lib/tree/TreeBuilder";

// Works only on spidered data
describe.skip("treeBuilder", () => {

    it("renders single level", async () => {
        const all = await new FileSystemProjectAnalysisResultStore().loadAll();
        const builder = treeBuilder<ProjectAnalysisResult>("root")
            .renderWith(DefaultProjectAnalysisResultRenderer);
        const t = builder.toSunburstTree(all);
    });

    it("renders and groups analyses", async () => {
        const all = await new FileSystemProjectAnalysisResultStore().loadAll();

        const builder = treeBuilder<ProjectAnalysisResult>("root")
            .group({ name: "foo", by: ar => ar.analysis.id.owner })
            .renderWith(DefaultProjectAnalysisResultRenderer);
        const t = builder.toSunburstTree(all);
    });

    it("renders and groups not excluding other", async () => {
        const all = await new FileSystemProjectAnalysisResultStore().loadAll();

        const builder = treeBuilder<ProjectAnalysisResult>("root")
            .group({ name: "foo", by: ar => ar.analysis.id.repo.length > 8 ? "foo" : "a" })
            .renderWith(DefaultProjectAnalysisResultRenderer);
        const t = await builder.toSunburstTree(all);
        assert.strictEqual(t.children.length, 2);
        assert.strictEqual(t.children.filter(c => c.name === "foo").length, 1);
    });

    it("renders and groups excluding other", async () => {
        const all = await new FileSystemProjectAnalysisResultStore().loadAll();

        const builder = treeBuilder<ProjectAnalysisResult>("root")
            .group({ name: "foo", by: ar => ar.analysis.id.repo.length > 8 ? undefined : "a" })
            .renderWith(DefaultProjectAnalysisResultRenderer);
        const t = await builder.toSunburstTree(all);
        assert.strictEqual(t.children.length, 1);
    });

    it("transforms and renders", async () => {
        const all = await new FileSystemProjectAnalysisResultStore().loadAll();

        const builder = treeBuilder<ProjectAnalysisResult>("root")
            .group({ name: "foo", by: ar => ar.analysis.id.owner })
            .map<number>(ars => ars.map(ar => ar.analysis.dependencies.length))
            .renderWith(num => ({
                name: num + "",
                size: num,
            }));
        const t = builder.toSunburstTree(all);
    });

    it("transforms and renders with split", async () => {
        const all = await new FileSystemProjectAnalysisResultStore().loadAll();

        const builder = treeBuilder<ProjectAnalysisResult>("root")
            .group({ name: "foo", by: ar => ar.analysis.id.owner })
            .split<string>({splitter: ar => ar.analysis.dependencies.map(d => d.artifact), namer: () => "y"})
            .renderWith(artifact => ({
                name: artifact,
                size: 1,
            }));
        const t = builder.toSunburstTree([all[0]]);
    });

    it("transforms and splits before grouping", async () => {
        const all = await new FileSystemProjectAnalysisResultStore().loadAll();

        const builder = treeBuilder<ProjectAnalysisResult>("root")
            .group({ name: "foo", by: ar => ar.analysis.id.owner })
            .split<string>({ splitter: ar => ar.analysis.dependencies.map(d => d.artifact), namer: a => "x"})
            .group({ name: "length", by: a => a.length > 5 ? "long" : "short"})
            .renderWith(artifact => ({
                name: artifact,
                size: 1,
            }));
        const t = builder.toSunburstTree([all[0]]);
    });

    it("adds customGroup layer", async () => {
        const all = await new FileSystemProjectAnalysisResultStore().loadAll();

        const builder = treeBuilder<ProjectAnalysisResult>("root")
            .group({ name: "foo", by: ar => ar.analysis.id.owner })
            .customGroup<number>({
                name: "thing",
                to: ars => {
                    return {
                        name: [1, 2, 3],
                    };
                },
            })
            .renderWith(num => ({
                name: num + "",
                size: num,
            }));
        const t = builder.toSunburstTree(all);
    });

    it("flattens single layer", async () => {
        const all = await new FileSystemProjectAnalysisResultStore().loadAll();

        const builder = treeBuilder<ProjectAnalysisResult>("root")
            .group({ name: "thing", by: ar => "foo", flattenSingle: true })
            .group({ name: "foo", by: ar => ar.analysis.id.url.length + "" })
            .renderWith(DefaultProjectAnalysisResultRenderer);
        const t = await builder.toSunburstTree(all);
        assert(t.children.length > 1);
    });

});
