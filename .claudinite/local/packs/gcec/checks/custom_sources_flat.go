package checks

import (
	"slices"
	"strings"

	"claudinite.com/checksdk"
)

// extension/event-extractors/custom/ holds per-site sources and nothing
// else: one flat <site>.js per site, no subdirectories, no other file
// kinds, and never a pipeline file. The load-order generator reads custom/
// one level deep and keeps only *.js, so anything else is silently dropped
// from the load order and never runs.
const (
	customDir = "extension/event-extractors/custom/"
	customWhy = "gen-load-order.js reads custom/ one level deep and keeps only *.js — anything else " +
		"is silently omitted from the load order and never runs"
)

// pipelineFiles live in event-extractors/, never in custom/.
var pipelineFiles = []string{"registry.js", "generic-extractor.js", "assemble-events.js"}

func init() {
	checksdk.Register(checksdk.Check{
		ID:   "custom-sources-flat",
		Tags: []string{"world"},
		Doc:  doc,
		Why:  customWhy,
		Run:  customSourcesFlat,
	})
}

func customSourcesFlat(repo checksdk.Repo) []checksdk.Finding {
	var out []checksdk.Finding
	for _, file := range repo.Files() {
		rest, ok := strings.CutPrefix(file, customDir)
		if !ok {
			continue
		}
		switch {
		case strings.Contains(rest, "/"):
			out = append(out, checksdk.Finding{
				Path:     file,
				Sentence: file + " sits in a subdirectory of custom/",
				Fix:      "flatten it to extension/event-extractors/custom/<site>.js, or move shared code to event-extractors/helpers/",
			})
		case !strings.HasSuffix(rest, ".js"):
			out = append(out, checksdk.Finding{
				Path:     file,
				Sentence: file + " is not a per-site source (custom/ holds only <site>.js files)",
				Fix:      "move it out of custom/ — that directory is the per-site extensibility point and nothing else",
			})
		case slices.Contains(pipelineFiles, rest):
			out = append(out, checksdk.Finding{
				Path:     file,
				Sentence: file + " is a pipeline file, not a per-site source",
				Why:      "the registry, the orchestrator and the core generic extractor are the pipeline itself — a different kind of thing from a per-site override",
				Fix:      "move " + rest + " back to extension/event-extractors/",
			})
		}
	}
	return out
}
