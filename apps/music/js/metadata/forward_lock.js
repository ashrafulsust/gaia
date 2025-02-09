/* global AudioMetadata, ForwardLock */
/* exported ForwardLockMetadata */
'use strict';

/**
 * Parse metadata for ForwardLocked files. Generally, this will forward on to
 * the metadata parser for the underlying format.
 */
var ForwardLockMetadata = (function() {

  /**
   * Parse a file and return a Promise with the metadata.
   *
   * @param {BlobView} locked The audio file to parse.
   * @return {Promise} A Promise returning the parsed metadata object.
   */
  function parse(locked) {
    return new Promise(function(resolve, reject) {
      ForwardLock.getKey(function(secret) {
        ForwardLock.unlockBlob(secret, locked, callback, reject);

        function callback(unlocked, unlockedMetadata) {
          // Now that we have the unlocked content of the locked file, pass it
          // back to AudioMetadata.parse to get the metadata. When we're done,
          // add some extra metadata to indicate that this is locked content (so
          // it isn't shared) and to specify the vendor that locked it.
          resolve(AudioMetadata.parse(unlocked)).then(function(metadata) {
            metadata.locked = true;
            if (unlockedMetadata.vendor) {
              metadata.vendor = unlockedMetadata.vendor;
            }
            if (!metadata.title) {
              metadata.title = unlockedMetadata.name;
            }
            return metadata;
          });
        }
      });
    });
  }

  return {
    parse: parse
  };

})();
