'use strict';

var Home = require(
  '../../../verticalhome/test/marionette/lib/home2');
var System = require('./lib/system');

marionette('Software Home Button - IME Menu', function() {

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
  var home, system;

  setup(function() {
    home = new Home(client);
    system = new System(client);
    system.waitForStartup();
    home.waitForLaunch();
    client.switchToFrame();
  });

  test('Proper layout for alerts', function() {
    client.executeScript(function() {
      window.dispatchEvent(new CustomEvent('mozChromeEvent', {
        detail: {
          type: 'inputmethod-showall'
        }
      }));
    });

    function rect(el) {
      return el.getBoundingClientRect();
    }

    var winHeight = client.findElement('body').size().height;
    client.waitFor(function() {
      var menuRect = system.imeMenu.scriptWith(rect);
      var shbRect = system.softwareButtons.scriptWith(rect);

      return winHeight === (menuRect.height + shbRect.height);
    });
  });
});
