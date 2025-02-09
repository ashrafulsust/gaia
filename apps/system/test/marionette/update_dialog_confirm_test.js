'use strict';

var fs = require('fs');

var Home = require(
  '../../../verticalhome/test/marionette/lib/home2');
var System = require('./lib/system');

var SHARED_PATH = __dirname + '/../../../../shared/test/integration/';

marionette('Software Home Button - Update Dialog Confirm', function() {

  var client = marionette.client({
    prefs: {
      'focusmanager.testmode': true,
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false,
      'software-button.enabled': false
    }
  });

  var home, system;
  setup(function() {
    home = new Home(client);
    system = new System(client);
    system.waitForStartup();
    home.waitForLaunch();
    client.switchToFrame();
  });

  function triggerUpdateDownload() {
    client.executeScript(function() {
      window.wrappedJSObject.dispatchEvent(new CustomEvent('mozChromeEvent', {
        detail: {
          type: 'update-downloaded'
        }
      }));
    });
  }

  test('Update confirm screen with battery', function() {
    client.executeScript(fs.readFileSync(
      SHARED_PATH + '/mock_navigator_battery.js', 'utf8'));

    triggerUpdateDownload();

    function rect(el) {
      return el.getBoundingClientRect();
    }
    var winHeight = client.findElement('body').size().height;
    client.waitFor(function() {
      var dialog = client.findElement('#dialog-screen');
      var dialogRect = dialog.scriptWith(rect);
      return winHeight === dialogRect.height;
    });
  });

  test('Update confirm screen without battery', function() {
    client.executeScript(function() {
      window.wrappedJSObject.navigator.battery.level = 0;
      window.wrappedJSObject.navigator.battery.charging = false;
    });

    triggerUpdateDownload();

    function rect(el) {
      return el.getBoundingClientRect();
    }
    var winHeight = client.findElement('body').size().height;
    client.waitFor(function() {
      var dialog = client.findElement('#dialog-screen');
      var dialogRect = dialog.scriptWith(rect);
      return winHeight === dialogRect.height;
    });
  });
});
