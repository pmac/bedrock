/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

(function () {
    'use strict';

    var $document = $(document);
    var $taskSteps = $('.task-steps');
    var $thankYou = $('#thankyou');
    var $downloadDevTools = $('.dev-edition');
    var $tryAnotherTask = $('.try-another');
    var $findCommunity = $('#communities');
    var $getInvolved = $('#get-involved');
    var visibilityChange = getVisibilityStateEventKeyword();

    /**
     * Determines the visibilitychange event name based on the current browser
     * and returns the appropriate keyword. Based on code from:
     * https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
     */
    function getVisibilityStateEventKeyword() {
        // for browser that support the event unprefixed
        if (typeof document.hidden !== 'undefined') {
            return 'visibilitychange';
        }

        // for Chrome 13 and lower
        if (typeof document.webkitHidden !== 'undefined') {
            return 'webkitvisibilitychange';
        }

        // for older versions of IE
        if (typeof document.msHidden !== 'undefined') {
            return 'msvisibilitychange';
        }
    }

    /**
     * Toggles the completed class on the relevant step, and calls
     * taskComplete() if this was the final step of the task.
     */
    function completeStep($step) {
        var $stepOne = $('#step_one');
        var $stepTwo = $('#step_two');

        if ($step.data('step') === 'one') {
            $stepOne.toggleClass('completed');
        } else if ($step.data('step') === 'two') {
            $stepTwo.toggleClass('completed');
        }

        if ($step.data('complete') === true) {
            taskComplete();
        }
    }

    /**
     * Called once all steps of the task has been completed. This will
     * show the thank message and scroll it into view.
     */
    function taskComplete() {
        $thankYou.removeClass('visibly-hidden');
        $thankYou.attr('aria-hidden', 'false');
        $thankYou[0].scrollIntoView();
        $thankYou.focus();
    }

    /**
     * Waits for the initial tab/window to become visible, and then
     * proceeds to complete the relevant task step.
     */
    function handleVisibilityChange($step) {
        // to be sure we do not queue a bunch of visibilityChange events,
        // because the browser did not fire the event, and thus `.off`
        // was never called, we first ensue no events are currently bound,
        // before binding a new one.
        $document.off(visibilityChange + '.taskview');

        $document.on(visibilityChange + '.taskview', function() {
            // we wait until our current tab is visible before
            // showing the thank you message.
            if (document.visibilityState === 'visible') {
                completeStep($step);
                $document.off(visibilityChange + '.taskview');
            }
        });
    }

    /**
     * Handles blur and focus events on the main window, and completes
     * the task step once the main window receives focus.
     */
    function handleFocusChange($step) {
        $(window).one('focus', function() {
            completeStep($step);
        });
    }

    /**
     * Sends data to GA about the interaction steps a user has taken.
     * @param {string} interaction - The kind of interaction
     */
    function trackInteraction(interaction) {
        window.dataLayer.push({
            event: 'get-involved-task-interaction',
            interaction: interaction
        });
    }

    /**
     * Handles completion of Firefox Mobile interaction steps.
     */
    function installFirefox(event) {
        var $this = $(event.target);

        if ($this.data('action') === 'install') {
            handleVisibilityChange($this);
        }
    }

    /**
     * Completes the tweet or follow Twitter actions for the follow Mozilla task.
     * @param {string} intentURL - The URL to point the new window to
     * @param {object} $eventTarget - The current event target
     * @param {string} interaction - String to pass to GA
     */
    function completeTwitterAction(intentURL, $eventTarget, interaction) {
        window.open(intentURL, 'twitter', 'width=550,height=480,scrollbars');
        handleFocusChange($eventTarget);
        trackInteraction(interaction);
    }

    /**
     * Handles completion of Follow Mozilla interaction steps.
     */
    function followMozilla(event) {
        var $this = $(event.target);
        var intentURL = 'https://twitter.com/intent/';
        var interactionMsg = '';
        var taskAction = $this.data('action');
        var tweetTxt = '';

        event.preventDefault();

        if (taskAction === 'tweet') {
            tweetTxt = $('#tweet_txt').text();
            intentURL += 'tweet?text=' + tweetTxt + '&hashtags=QA1';
            interactionMsg = 'tweeted to @startmozilla';
        }

        if (taskAction === 'follow') {
            intentURL += 'follow/?screen_name=startmozilla';
            interactionMsg = 'followed @startmozilla';
        }

        completeTwitterAction(intentURL, $this, interactionMsg);
    }

    /**
     * Called by joyOfCoding, monitors video playback and marks the video step
     * as watched once we reach the 40sec mark.
     * @param {object} $video - The video element as a jQuery object.
     */
    function markAsWatched($video) {
        var videoElement = $video[0];

        // a user can click play again after having watched the video the
        // first time. Clicking on pause, for example, will also trigger the
        // click event so, we need to ensure we only run the below on the
        // first interaction.
        if ($video.data('watched') !== true) {
            $video.on('timeupdate.taskview', function() {
                // user needs to watch at least 40 seconds before we mark
                // this step as complete.
                if (videoElement.currentTime >= 40) {
                    completeStep($video);
                    // once the step has been completed,
                    // remove the event listener.
                    $video.off('timeupdate.taskview');
                    $video.data('watched', true);
                    trackInteraction('completed joy of coding');
                }
            });
        }
    }

    /**
     * Handles completion of simple anchor click interaction events.
     * @param {object} event - The event that was triggered
     * @param {string} interaction - The interaction string to send to GA
     */
    function simpleLinkActionHandler(event, interaction) {
        handleVisibilityChange($(event.target));
        trackInteraction(interaction);
    }

    /**
     * Handles completion of Joy of Coding interaction steps.
     */
    function joyOfCoding(event) {
        var $this = $(event.target);

        // to avoid sending multiple pings to GA as a user pauses and plays the video,
        // we check whether the data-ga attribute exists. If it does, there is nothing
        // to do here, so just return.
        if ($this.data('ga')) {
            return;
        }

        var $jocVideo = $('#joc');
        var videoElement = $jocVideo[0];
        var $playButton = $('.watch');

        // If the interaction happened on the video element itself, simply track
        // the event and call markAsWatched. Let the video element do it's thing.
        if ($this[0].id === 'joc' && $this[0].paused) {
            // we need to set the ga data attribute on both the video element
            // and the button, because we do not know where the next interaction
            // will be triggered from.
            $this.attr('data-ga', true);
            $playButton.attr('data-ga', true);

            trackInteraction('play joy of coding');
            markAsWatched($this);
        } else if ($this.data('action') === 'play' && videoElement.paused) {
            videoElement.play();

            $this.attr('data-ga', true);
            $jocVideo.attr('data-ga', true);

            trackInteraction('play joy of coding');
            markAsWatched($jocVideo);
        }
    }

    // send GA events for clicks on the dev edition download button
    if ($downloadDevTools.length > 0) {
        $downloadDevTools.on('click', function() {
            trackInteraction('download firefox dev edition');
        });
    }

    // send GA events for clicks on the back and try another task links
    $tryAnotherTask.on('click', function() {
        var $this = $(this);
        trackInteraction($this.text());
    });

    // send GA event for clicks on the Find your local community link
    $findCommunity.on('click', function() {
        trackInteraction('Find your local community exit link');
    });

    // send GA event for clicks on the get involved links
    $getInvolved.on('click', function() {
        trackInteraction('Get involved exit link clicked');
    });

    $taskSteps.on('click', function(event) {

        var $target = $(event.target);
        var currentTask = $target.data('task');

        switch(currentTask) {
        case 'follow-mozilla':
            followMozilla(event);
            break;
        case 'firefox-mobile':
            installFirefox(event);
            break;
        case 'encryption':
            simpleLinkActionHandler(event, 'Take the pledge');
            break;
        case 'joyofcoding':
            joyOfCoding(event);
            break;
        case 'devtools':
            simpleLinkActionHandler(event, event.target.dataset.action + ' exit link');
            break;
        case 'stumbler':
            simpleLinkActionHandler(event, 'Install stumbler exit link');
            break;
        default:
            // if no task matched, do nothing
            return false;
        }
    });
})();
