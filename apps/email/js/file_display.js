'use strict';
define(function(require) {
  var mozL10n = require('l10n!');

  return {
    /**
     * Display a human-readable file size.  Currently we always display
     * things in kilobytes because we are targeting a mobile device and we
     * want bigger sizes (like megabytes) to be obviously large numbers.
     */
    fileSize: function(sizeInBytes) {
      var kilos = Math.ceil(sizeInBytes / 1024);
      return mozL10n.get('attachment-size-kib', { kilobytes: kilos });
    }
  };
});
