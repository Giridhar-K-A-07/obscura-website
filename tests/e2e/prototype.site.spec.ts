import { accessibilitySuite } from "./suites/accessibility";
import { motionSuite } from "./suites/motion";
import { navigationSuite } from "./suites/navigation";
import { pageSuite } from "./suites/pages";
import { siteFilesSuite } from "./suites/siteFiles";

// The normal build (dist/), the one that deploys: run in the prototype-desktop and prototype-mobile projects.
pageSuite("prototype");
accessibilitySuite("prototype");
navigationSuite("prototype");
motionSuite("prototype");
siteFilesSuite("prototype");
