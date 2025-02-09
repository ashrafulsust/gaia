'use strict';

var Home = require(
  '../../../verticalhome/test/marionette/lib/home2');
var Rocketbar = require('./lib/rocketbar');
var System = require('./lib/system');

marionette('Software Home Button - Permission Prompt', function() {

  var client = marionette.client({
    prefs: {
      'focusmanager.testmode': true,
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false,
      'software-button.enabled': true
    }
  });
  var home, rocketbar, system;

  setup(function() {
    home = new Home(client);
    rocketbar = new Rocketbar(client);
    system = new System(client);
    system.waitForStartup();
    home.waitForLaunch();
    client.switchToFrame();
  });

  test('Proper layout for the prompt', function() {

    rocketbar.homescreenFocus();
    rocketbar.enterText('a');

    function rect(el) {
      return el.getBoundingClientRect();
    }

    var winHeight = client.findElement('body').size().height;
    client.waitFor(function() {
      var dialog = client.helper.waitForElement('#permission-dialog');
      var dialogRect = dialog.scriptWith(rect);
      var shbRect = system.softwareButtons.scriptWith(rect);

      return dialogRect.bottom === shbRect.top &&
        winHeight === (dialogRect.height + shbRect.height);
    });
  });
});
