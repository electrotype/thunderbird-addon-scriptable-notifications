// Based on https://stackoverflow.com/a/71600199/843699

var { ExtensionCommon } = ChromeUtils.import(
  "resource://gre/modules/ExtensionCommon.jsm"
);
var { FileUtils } = ChromeUtils.import("resource://gre/modules/FileUtils.jsm");
var { XPCOMUtils } = ChromeUtils.import(
  "resource://gre/modules/XPCOMUtils.jsm"
);
XPCOMUtils.defineLazyGlobalGetters(this, ["IOUtils"]);

function alert(msg) {
  Services.wm
    .getMostRecentWindow("mail:3pane")
    .alert(`[Extension "Scriptable Notifications"] ${msg}`);
}

this.nativeExecutableAPI = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      nativeExecutableAPI: {
        async execute(executablePath, params) {
          if (!executablePath) {
            return false;
          }

          var fileExists = await IOUtils.exists(executablePath);
          if (!fileExists) {
            alert(`Error: native executable not found: ${executablePath}`);
            return false;
          }
          var progPath = new FileUtils.File(executablePath);

          let process = Cc["@mozilla.org/process/util;1"].createInstance(
            Ci.nsIProcess
          );
          process.init(progPath);
          process.startHidden = false;
          process.noShell = true;
          process.run(true, params, params.length);
          return true;
        },
      },
    };
  }
};
