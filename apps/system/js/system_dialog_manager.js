/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/* global Service */
'use strict';

(function(exports) {
  var DEBUG = false;

  /**
   * A manager for each SystemDialog `show` and `hide`.
   * Show a dialog - the dialog publish `show` event from SystemDialog.
   * Hide a dialog - the dialog publish `hide` event from SystemDialog.
   *               - a new active dialog publish 'system-dialog-show' event,
   *                 then hide the previous active dialog.
   *               - received 'home', 'holdhome' event from the home button.
   *                 And pass the event type to be the argument
   *                 for options `onHide` attribute.
   *
   * @class SystemDialogManager
   * @requires module:Service
   */
  var SystemDialogManager = function SystemDialogManager() {
    this.init();
  };

  SystemDialogManager.prototype = {

    /**
     * System app is made of a top-level `<div ="screen"></div>` DOM element
     * which contain all possible screens displayed by the app.
     * Multiple screens can be displayed at a time.
     * We store the list of currently
     * visible screens into this DOM element class attribute.
     *
     * @memberof SystemDialogManager
     * @prop {DOMElement} windows - the `#windows` element, which is the same
     *                              element that the would AppWindowManager use.
     * @prop {DOMElement} screen - the `#screen` element.
     */
    elements: {
      windows: null,
      screen: null
    },

    /**
     * @memberof SystemDialogManager#
     *
     */
    states: {
      activeDialog: null,
      runningDialogs: {}
    },

    /**
     * @memberof SystemDialogManager#
     */
    configs: {
      listens: ['system-dialog-created',
                'system-dialog-show',
                'system-dialog-hide',
                'simlockcreated',
                'simlockshow',
                'simlockhide',
                'system-resize',
                'system-dialog-requestfocus',
                'simlockrequestfocus',
                'home',
                'holdhome',
                'mozChromeEvent']
    }
  };

  SystemDialogManager.prototype.isActive = function() {
    return !!this.states.activeDialog;
  };

  SystemDialogManager.prototype.setHierarchy = function(active) {
    if (!this.states.activeDialog) {
      return;
    }
    if (active) {
      this.states.activeDialog.focus();
    }
    this.states.activeDialog._setVisibleForScreenReader(active);
  };

  SystemDialogManager.prototype.name = 'SystemDialogManager';
  SystemDialogManager.prototype.EVENT_PREFIX = 'systemdialogmanager';

  SystemDialogManager.prototype.publish = function(evtName) {
    this.debug('publishing ' + evtName);
    window.dispatchEvent(new CustomEvent(this.EVENT_PREFIX + evtName, {
      detail: this
    }));
  };

  /**
   * @listens system-dialog-created - when a system dialog got created,
   *                                  it would fire this event.
   * @listens system-dialog-show - when a system dialog got show request,
   *                               it would fire this event.
   * @listens system-dialog-hide - when a system dialog got hide request,
   *                               it would fire this event.
   * @listens system-resize - when the size of LayoutManager is changed,
   *                          LayoutManager would send system-resize event.
   * @this {SystemDialogManager}
   * @memberof SystemDialogManager
   */
  SystemDialogManager.prototype.handleEvent = function sdm_handleEvent(evt) {
    var dialog = null;
    switch (evt.type) {
      case 'system-dialog-requestfocus':
      case 'simlockrequestfocus':
        if (evt.detail !== this.states.activeDialog) {
          return;
        }
        Service.request('focus', this);
        break;
      case 'simlockcreated':
      case 'system-dialog-created':
        dialog = evt.detail;
        this.registerDialog(dialog);
        break;
      case 'simlockshow':
      case 'system-dialog-show':
        dialog = evt.detail;
        this.activateDialog(dialog);
        break;
      case 'simlockhide':
      case 'system-dialog-hide':
        dialog = evt.detail;
        this.deactivateDialog(dialog);
        break;
      case 'system-resize':
        if (this.states.activeDialog) {
          this.states.activeDialog.resize();
        }
        break;
      case 'home':
      case 'holdhome':
        // Automatically hide the dialog on home button press
        if (this.states.activeDialog) {
          // Deactivate the dialog and pass the event type in the two cases
          this.deactivateDialog(this.states.activeDialog, evt.type);
        }
        break;
      case 'mozChromeEvent':
        if (!this.states.activeDialog || !evt.detail ||
          evt.detail.type !== 'inputmethod-contextchange') {
          return;
        }
        var typesToHandle = ['select-one', 'select-multiple', 'date', 'time',
          'datetime', 'datetime-local', 'blur'];
        if (typesToHandle.indexOf(evt.detail.inputType) < 0) {
          return;
        }
        // Making sure app-window does not receive this event.
        evt.stopImmediatePropagation();
        this.states.activeDialog.broadcast('inputmethod-contextchange',
          evt.detail);
        break;
    }
  };

  SystemDialogManager.prototype.init = function sdm_init() {
    this.initElements();
    this.start();
    this.debug('init:');
  };

  /**
   * @private
   * @this {SystemDialogManager}
   * @memberof SystemDialogManager
   */
  SystemDialogManager.prototype.initElements = function sdm_initElements() {
    var selectors = { windows: 'windows', screen: 'screen'};
    for (var name in selectors) {
      var id = selectors[name];
      this.elements[name] = document.getElementById(id);
    }
  };

/**
   * Hook listeners of events this manager interested in.
   *
   * @private
   * @this {SystemDialogManager}
   * @memberof SystemDialogManager
   */
  SystemDialogManager.prototype.start = function sdm_start() {
    this.configs.listens.forEach((function _initEvent(type) {
      self.addEventListener(type, this);
    }).bind(this));
    Service.request('registerHierarchy', this);
  };

  /**
   * @private
   * @this {SystemDialogManager}
   * @memberof SystemDialogManager
   */
  SystemDialogManager.prototype.registerDialog =
    function sdm_registerDialog(dialog) {
      this.states.runningDialogs[dialog.instanceID] = dialog;
    };

  /**
   * @private
   * @this {SystemDialogManager}
   * @memberof SystemDialogManager
   */
  SystemDialogManager.prototype.unregisterDialog =
    function sdm_unregisterDialog(dialog) {
      delete this.states.runningDialogs[dialog.instanceID];
    };

  /**
   * Set an dialog as the active dialog.
   *
   * @private
   * @this {SystemDialogManager}
   * @memberof SystemDialogManager
   */
    SystemDialogManager.prototype.activateDialog =
    function sdm_activateDialog(dialog) {
      this.debug('activateDialog: dialog.instanceID = ' + dialog.instanceID);
      // Hide the previous active dialog.
      if (this.states.activeDialog &&
          dialog.instanceID != this.states.activeDialog.instanceID) {
        // Means other dialog interrupted.
        // Then, have to hide the previous active dialog.
        this.states.activeDialog.hide('interrupted', true);
      }

      // Record new active dialog.
      this.states.activeDialog = dialog;

      // Activate dialog on screen element.
      if (!this.elements.screen.classList.contains('dialog')) {
        this.elements.screen.classList.add('dialog');
        this.publish('-activated');
      }
    };

  /**
   * Deactivate the current active dialog.
   *
   * @private
   * @this {SystemDialogManager}
   * @memberof SystemDialogManager
   */
  SystemDialogManager.prototype.deactivateDialog =
    function sdm_deactivateDialog(dialog, reason) {
      this.debug('deactivateDialog: dialog.instanceID = ' + dialog.instanceID);
      if (this.states.activeDialog &&
          dialog.instanceID == this.states.activeDialog.instanceID) {
        // Hide itself
        if (reason) { // The request is coming from SystemDialogManager.
          this.states.activeDialog.hide(reason, true);
        } else { // The request is coming from dialog controller.
          // Do nothing since the dialog is hidden already.
        }

        // Deactivate dialog on screen element
        this.elements.screen.classList.remove('dialog');

        // Clear activeDialog
        this.states.activeDialog = null;
        this.publish('-deactivated');
      } else { // The dialog is not active.
        // Just hide itself, no need to disturb other active dialog.
        // Since the dialog is hidden already, do nothing here.
      }
    };

  SystemDialogManager.prototype.debug = function sd_debug() {
    if (DEBUG) {
      console.log('[SystemDialogManager]' +
        '[' + Service.currentTime() + ']' +
        '[' + Array.slice(arguments).concat() + ']');
    }
  };

  exports.SystemDialogManager = SystemDialogManager;

}(window));
