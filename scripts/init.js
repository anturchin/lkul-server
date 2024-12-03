require("./insertRegions").then(() => {
  require("./insertSuperAdmin");
  require("./insertAdmin");
  require("./insertCurator");
  require("./defaultDBValues");
  require("./createMrgOrg");
  require("./insertMetBlockings");
  require("./insertRolsForAllUsers");
  require("./tabs");
  require("./contracts");

  process.exit();
});
