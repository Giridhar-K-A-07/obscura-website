import { accessibilitySuite } from "./suites/accessibility";
import { motionSuite } from "./suites/motion";
import { navigationSuite } from "./suites/navigation";
import { pageSuite } from "./suites/pages";
import { siteFilesSuite } from "./suites/siteFiles";

// The opt-in demo build (dist-demo/), local only: run in the demo-desktop and demo-mobile projects.
pageSuite("demo");
accessibilitySuite("demo");
navigationSuite("demo");
motionSuite("demo");
siteFilesSuite("demo");
