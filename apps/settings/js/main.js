require(['config/require'], function() {
  'use strict';

  define('boot', function(require) {
    // The following are the scripts used by many other scripts. We load them
    // at once here. These should be move to the dependency of each panel in the
    // future.
    require('utils');
    require('shared/async_storage');
    require('shared/settings_listener');
    // used by wifi.js, wifi_select_certificate_file.js
    require('shared/wifi_helper');
    // used by messaging.js
    require('shared/icc_helper');
    // used by all header building blocks
    require('shared/font_size_utils');

    var SettingsUtils = require('modules/settings_utils');
    var SettingsService = require('modules/settings_service');
    var PageTransitions = require('modules/page_transitions');
    var LazyLoader = require('shared/lazy_loader');
    var ScreenLayout = require('shared/screen_layout');
    var Settings = require('settings');

    function isInitialPanel(panel) {
      if (Settings.isTabletAndLandscape()) {
        return panel === Settings.initialPanelForTablet;
      } else {
        return panel === ('#' + window.LaunchContext.initialPanelId);
      }
    }

    window.addEventListener('panelready', function onPanelReady(e) {
      if (!isInitialPanel(e.detail.current)) {
        return;
      }

      window.removeEventListener('panelready', onPanelReady);

      // Activate the animation and user interaction.
      document.body.dataset.ready = true;

      // The loading of the first panel denotes that we are ready for display
      // and ready for user interaction
      window.dispatchEvent(new CustomEvent('moz-content-interactive'));
    }, false);

    window.addEventListener('telephony-settings-loaded',
      function onTelephonySettingsLoaded() {
        window.removeEventListener('telephony-settings-loaded',
          onTelephonySettingsLoaded);

        // The loading of telephony settings is dependent on being idle,
        // once complete we are safe to declare the settings app as loaded
        window.dispatchEvent(new CustomEvent('moz-app-loaded'));
      });

    /**
     * In two column layout, the root panel should not be deactivated. We pass
     * the id of the root panel to SettingsService so that it won't deactivate
     * the root panel when in two column.
     * XXX: Currently we don't separate the navigation logic of one column and
     *      two column layout, so that the root panel will not be deactivated
     *      in one column layout.
     */
    SettingsService.init({
      rootPanelId: 'root',
      context: window.LaunchContext
    });

    var options = {
      SettingsUtils: SettingsUtils,
      SettingsService: SettingsService,
      PageTransitions: PageTransitions,
      LazyLoader: LazyLoader,
      ScreenLayout: ScreenLayout
    };

    if (document && (document.readyState === 'complete' ||
        document.readyState === 'interactive')) {
      Settings.init(options);
    } else {
      window.addEventListener('load', function onload() {
        window.removeEventListener('load', onload);
        Settings.init(options);
      });
    }

    // Tell audio channel manager that we want to adjust the notification
    // channel if the user press the volumeup/volumedown buttons in Settings.
    if (navigator.mozAudioChannelManager) {
      navigator.mozAudioChannelManager.volumeControlChannel = 'notification';
    }
  });

  require(['boot']);
});
