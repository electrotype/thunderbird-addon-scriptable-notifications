this.utils = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      utils: {
        //==========================================
        // Alert for background scripts
        //==========================================
        async alert(msg, stringify) {
          if (stringify) {
            msg = JSON.stringify(msg, null, 2);
          }

          Services.wm.getMostRecentWindow("mail:3pane").alert(msg);
        },

        //==========================================
        // Console.log with stringification
        //==========================================
        async log(msg, stringify) {
          if (stringify) {
            msg = JSON.stringify(msg, null, 2);
          }

          console.log(msg);
        },
      },
    };
  }
};
