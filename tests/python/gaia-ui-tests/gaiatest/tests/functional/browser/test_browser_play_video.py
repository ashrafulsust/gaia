# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette import Wait
from gaiatest import GaiaTestCase
from gaiatest.apps.search.app import Search
from gaiatest.apps.search.regions.html5_player import HTML5Player
from gaiatest.apps.homescreen.regions.permission_dialog import PermissionDialog


class TestVideo(GaiaTestCase):

    acceptable_delay = 2.0

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_local_area_network()
        self.video_URL = self.marionette.absolute_url('VID_0001.ogg')
        self.apps.set_permission_by_url(Search.manifest_url, 'geolocation', 'deny')

    def test_play_video(self):
        """Confirm video playback

        https://moztrap.mozilla.org/manage/case/6073/
        """
        search = Search(self.marionette)
        search.launch()
        browser = search.go_to_url(self.video_URL)
        browser.wait_for_page_to_load(180)
        browser.switch_to_content()

        player = HTML5Player(self.marionette)

        # Check that video is playing
        player.wait_for_video_loaded()
        self.assertTrue(player.is_video_playing())

        # Tap on the edge of the video to make the controls appear
        player.invoke_controls()
        # Pause playback
        player.tap_pause()
        stopped_at = player.current_timestamp
        self.assertFalse(player.is_video_playing())

        resumed_at = player.current_timestamp

        # Resume playback
        player.tap_play()

        # Ensure that video resumes to play
        # from the place where it was paused
        delay = resumed_at - stopped_at
        self.assertLessEqual(delay, self.acceptable_delay,
                             'video resumed to play not from place where it was paused, paused at %.3f, resumed at %.3f' % (stopped_at, resumed_at))

        # Make sure the video is ready to play again
        player.wait_for_video_loaded()

        # This is disabled for now, because of bug 1100333
        # self.assertTrue(player.is_video_playing())

        # After tapping the play button, the controls disappear, make them appear again
        player.invoke_controls()

        # Tap mute button
        player.tap_mute()
        player.tap_unmute()
