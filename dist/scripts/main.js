/**
 * video2 - Video arkiv frontend
 * @version v0.0.2
 * @link https://github.com/blgrgjno/video-archive-front
 * @license GPL-2.0
 */
/* global Popcorn: true */
(function() {
  'use strict';
  // main popcorn
  var popcorn = null;
  var MAX_TIME=99999;

  // Array that stores the chapters
  var chapters = [];

  /**
   * Loads a slide
   * @param {object} slide - The slide to load
   * @param {number} end - The end time
   * @param {string} slideURL - URL of slide
   * @return {boolean} - True if loaded, false if not loaded
   */
  function loadSlide(slide, end, slideURL) {
    var title = slide.title[0];
    var startTime = Number(slide.startTime[0]);
    var endTime = Number(end);

    function getHTML() {
      var tmpSlide = slide.slideURL[0];
      var html = '<h2> * Error: no slide available * </h2>';

      if (tmpSlide) {
        html = '<img src="' + encodeURI(slideURL) + '">';
      } else if (title) {
        html = '<h2>' + encodeURI(title) + '</h2>';
      }

      return html;
    }

    if (popcorn) {
      // dont add if the values are suspect
      if (startTime !== endTime) {
        console.log('Added slide (start=%d, end=%d)',
                    startTime, endTime);
        popcorn.footnote({
          start: startTime,
          end: endTime,
          target: 'slides',
          //direction: 'up',
          text: getHTML()
        });

        return true;
      } else {
        console.log('Ignoring slide with start=%d and end=%d',
                    startTime, endTime);
      }
    } else {
      console.log('Can\'t find popcorn. Ignoring slides');
    }

    return false;
  }

  /**
   * Loads a chapter
   */
  function loadChapter(chapter) {
    var start = chapter.startTime[0];
    var title = chapter.title[0];

    var hours = parseInt(start / 3600) % 24;
    var minutes = parseInt(start / 60) % 60;
    var seconds = start % 60;

    var startTimeStr =
          (hours < 10 ? '0' + hours : hours) + '-' +
          (minutes < 10 ? '0' + minutes : minutes) + '-' +
          (seconds < 10 ? '0' + seconds : seconds);

    var el = document.querySelector('.selectpicker');

    if (el) {
      var optionEl = document.createElement('option');
      optionEl.textContent = startTimeStr + ' - ' + title;
      el.appendChild(optionEl);
    }

    chapters.push(start);
  }

  /**
   * Load video
   * @param {string} videoId - the GUID of the video to load
   * @param {function} err - the error callback
   * @param {function ok - the ok callback
   */
  function loadVideo(videoId, err, ok) {
    var request;

    request = new XMLHttpRequest();
    request.open('GET', 'data/video/' + videoId + '/meta.json', true);

    request.onreadystatechange = function() {
      var json;
      if (this.readyState === 4) {
        if (this.status >= 200 && this.status < 400) {
          // Success!
          try  {
            json = JSON.parse(this.responseText);
          } catch (ex) {
            return err('Unable to parse meta.json file `' +
                       ex.message + '`');
          }
          return ok(JSON.parse(this.responseText));
        } else {
          return err('Unable to find video');
        }
      }
      return null;
    };

    request.send();
    request = null;

    return null;
  }

  /**
   * Loads all slides and chapters
   * @param {string} videoId - the GUID of the video
   * @param {function} onData - callback with video as parameter, for
   * called each video
   */
  function loadSlidesAndChapters(videoId, onData, onError) {
    loadVideo(videoId, function(errorMsg) {
      onError(errorMsg);
    }, function(data) {
      var slides = data.slides || [];
      var numSlidesOrChapters = slides ? slides.length : 0;
      var numSlides = 0;
      var numChapters = 0;

      forEach(slides, function(slide, index) {
        // Not a slide, but a chapter mark
        var isChapter = ('true' === slide.isChapter[0]);
        var i, slideURL;

        // Ignore not cued
        if ('false' === slide.isCued[0]) {
          console.log('Ignoring uncued slide');
          return;
        }

        if (isChapter) {
          for (i = index; i < numSlidesOrChapters; i++) {
            if ('true' === slides[i].isChapter[0]) {
              loadChapter(slide, slides[i].startTime[0]);
              numChapters++;
              break;
            }
          }
        } else {
          // make footnote timeline for slides
          var loaded = false;
          for (i = index+1; i < numSlidesOrChapters; i++) {
            if ('false' === slides[i].isChapter[0] &&
              'false' !== slides[i].isCued[0]) {
              slideURL = 'data/video/' +
                encodeURI(data.itemID) + '/timeline/' +
                slide.slideURL[0];
              // set next slides starttime as endtime
              var endTime = slides[i].startTime[0];
              loaded = loadSlide(slide, endTime, slideURL);
              if (loaded) {
                numSlides++;
              }
              break;
            }
          }

          if (! loaded) {
            // probably only one slide
            var end = MAX_TIME;
            slideURL = 'data/video/' +
              encodeURI(data.itemID) + '/timeline/' +
              slide.slideURL[0];
            loaded = loadSlide(slide, end, slideURL);
            if (loaded) {
              numSlides++;
            }
          }
        }
      });

      // Add has-slides class to body, if there are slides
      if (numSlides > 0) {
        if (document.body.classList) {
          document.body.classList.add('has-slides');
        } else {
          document.body.className += ' ' + 'has-slides';
        }
      }

      // Add no-chapters if chapters are missing
      if (0 === numChapters) {
        if (document.body.classList) {
          document.body.classList.add('no-chapters');
        } else {
          document.body.className += ' ' + 'no-chapters';
        }
      }

      // Perform callback
      if (onData && typeof onData === 'function') {
        onData(data);
      }
    });
  }

  // --
  // some helpers
  // --
  function ready(fn) {
    if (document.addEventListener) {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      document.attachEvent('onreadystatechange', function() {
        if (document.readyState === 'interactive') {
          fn();
        }
      });
    }
  }

  function forEach(array, fn) {
    var i;
    for (i = 0; i < array.length; i++) {
      fn(array[i], i);
    }
  }
  /*jshint unused:false*/
  function addEventListener(el, eventName, handler) {
    if (el.addEventListener) {
      el.addEventListener(eventName, handler);
    } else {
      el.attachEvent('on' + eventName, function(){
        handler.call(el);
      });
    }
  }

  function getParameterByName(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)'),
        results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
  }

  function addPoster(poster) {
    if (popcorn.media) {
      popcorn.media.setAttribute('poster', poster);
    }
  }

  function addDownloadLink(videoFile, encodedVideoFile, filenameAfterDownload) {
    // add download link
    var aEl = document.querySelector('.download').
          getElementsByTagName('a')[0];

    filenameAfterDownload = filenameAfterDownload || encodedVideoFile;

    aEl.href = videoFile;
    aEl.download = filenameAfterDownload;
    aEl.title = 'Last ned ' + filenameAfterDownload;

    aEl.parentNode.style.display = 'block';
  }

  function updatePageTitle(title) {
    document.title = title;
  }

  /**
   * Will show error message in an catastophic fashion
   */
  function showErrorMessage(msg) {
    // Rest is done via CSS
    if (document.body.classList) {
      document.body.classList.add('has-error');
    } else {
      document.body.className += ' ' + 'has-error';
    }

    // Update error message
    document.querySelector('.error-message')
      .textContent = 'Can\'t play video because of an error: `' + msg + '`';
  }

  /** Flips the horizontal position of video and slides
   */
  function flipVideoandSlides() {
    var videoEl = document.getElementById('ourvideo');
    var slideEl = document.getElementById('slides');
    slideEl.parentNode.removeChild(slideEl);
    videoEl.parentNode.insertBefore(slideEl, videoEl);
  }

  /** Will be called after json file is loaded
   * @param {object} The json object
   */
  function loadVideoFileCallback(data) {
    var encodedVideoFile = encodeURI(data.videoFile);
    var videoFile = 'data/video/' + encodeURI(data.itemID) + '/' +
          encodedVideoFile;

    if ('left' === data.slideScreenPosition[0]) {
      flipVideoandSlides();
    }

    // add video to media object
    var scriptEl = document.createElement('source');
    scriptEl.setAttribute('src', videoFile);
    document.getElementById('ourvideo').appendChild(scriptEl);

    addDownloadLink(videoFile, encodedVideoFile, data.title + '.mp4');
    if (data.poster) {
      addPoster(encodeURI('data/video/' + data.itemID + '/' + data.poster));
    }

    updatePageTitle(data.title);

    if (document.body.classList) {
      document.body.classList.add('has-loaded');
    } else {
      document.body.className += ' ' + 'has-loaded';
    }
  }

  ready(function() {
    var videoId = getParameterByName('watch');
    var errorMsg;

    if (! videoId) {
      errorMsg = 'You need to provide a query parameter `watch`'+
        ' with a guid';
      showErrorMessage(errorMsg);
      throw errorMsg;
    }

    if (! /^[-a-f0-9]+$/.test(videoId) ) {
      errorMsg = 'The query parameter `watch` contains illegal'+
        ' characters';
      showErrorMessage(errorMsg);
      throw errorMsg;
    }

    if (! (videoId && videoId.toString().length === 36)) {
      errorMsg = 'Expected query parameter `watch` to be of'+
        ' length 36 (not ' + videoId.toString().length +
        ')';
      showErrorMessage(errorMsg);
      throw errorMsg;
    }

    popcorn = Popcorn('#ourvideo');

    loadSlidesAndChapters(videoId, loadVideoFileCallback, showErrorMessage);

    addEventListener(document.getElementsByTagName('select')[0],
                     'change', function() {
                        popcorn.currentTime(chapters[this.selectedIndex]);
                      });
  });
})();
