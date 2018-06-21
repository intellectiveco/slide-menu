'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// TODO: make this library agnostic
// TODO: document the events

(function ($) {
  var PLUGIN_NAME = 'slideMenu';
  var DEFAULT_OPTIONS = {
    position: 'right',
    showBackLink: true,
    keycodeOpen: null,
    keycodeClose: 27, //esc
    submenuLinkBefore: '',
    submenuLinkAfter: '',
    backLinkBefore: '',
    backLinkAfter: '',
    showOverlay: true,
    dynamicSourceFetchFunction: null,
    dynamicSourceDataAttribute: 'source',
    dynamicLoadingContent: 'Loading...'
  };

  var SlideMenu = function () {
    function SlideMenu(options) {
      _classCallCheck(this, SlideMenu);

      this.options = options;
      this._menu = options.elem; // the left and right nav menu elements
      // Add wrapper
      this._menu.find('ul:first').wrap('<div class="slider">'); // wraps div with class slider around every ul that is the first child of its parent
      this._anchors = this._menu.find('a'); // returns an object with all of the anchors
      this._slider = this._menu.find('.slider:first'); // returns an object with all of the slider elements that are the first child of its parent

      this._level = 0;
      this._isOpen = false;
      this._isAnimating = false;
      this._hasMenu = this._anchors.length > 0; // returns boolean representing if this._anchors length is greater than 0
      this._lastAction = null;

      // NOTES
      // need to write a new function set up dynamic menus
      // before we bind event handlers and set up menus, we need to add data-processed and data-function attributes to each of the anchor tags
      // for each anchor tag, we check if it's been processed
      // if it's hasn't been processed, we check if there's a data-function
      // if there's a data function, we will inject a new ul with an li with loading next to the anchor tag
      // when this anchor tag gets clicked, we will fire the function which will return a promise
      // when the promise gets resolved, for each new menu item, it will create a new li with anchor inside of the ul
      // each new anchor will go through process of having processed = false and, if needed, data function added to it (how do we know if a new menu item needs to have data-function added to it?)

      this._setupEventHandlers(); // attaches click handlers to all of the anchors
      this._setupMenu(); // set up which side menus are going to be on

      if (this._hasMenu) this._setupSubmenus(); //
      this._appendOverlay();
    }

    _createClass(SlideMenu, [{
      key: '_appendOverlay',
      value: function _appendOverlay() {
        var _this = this;

        this._overlay = $('<div class="slide-menu-overlay"></div>');
        if (this.options.showOverlay) {
          this._overlay.hide().click(function (event) {
            _this.close();
          });
          this._menu.before(this._overlay);
        }
      }

      /**
       * Toggle the menu
       * @param {boolean|null} open
       * @param {boolean} animate
       */

    }, {
      key: 'toggle',
      value: function toggle() {
        var open = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
        var animate = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

        var offset = void 0;

        if (open === null) {
          if (this._isOpen) {
            this.close();
          } else {
            this.open();
          }
          return;
        } else if (open) {
          offset = 0;
          this._isOpen = true;
        } else {
          offset = this.options.position === 'left' ? '-100%' : '100%';
          this._isOpen = false;
        }

        this._triggerEvent();

        if (animate) this._triggerAnimation(this._menu, offset);else {
          this._pauseAnimations(this._triggerAnimation.bind(this, this._menu, offset));
          this._isAnimating = false;
        }
      }

      /**
       * Open the menu
       * @param {boolean} animate Use CSS transitions
       */

    }, {
      key: 'open',
      value: function open() {
        var animate = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;

        this._lastAction = 'open';
        this._menu.scrollTop(0);
        this.toggle(true, animate);
        this._overlay.fadeIn('fast');
      }

      /**
       * Close the menu
       * @param {boolean} animate Use CSS transitions
       */

    }, {
      key: 'close',
      value: function close() {
        var animate = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;

        this._lastAction = 'close';
        this.toggle(false, animate);
        this._overlay.fadeOut('fast');
      }

      /**
       * Navigate one menu hierarchy back if possible
       */

    }, {
      key: 'back',
      value: function back() {
        this._lastAction = 'back';
        this._navigate(null, -1);
      }

      /**
       * Navigate to a specific link on any level (useful to open the correct hierarchy directly)
       * @param {string|object} target A string selector a plain DOM object or a jQuery instance
       */

    }, {
      key: 'navigateTo',
      value: function navigateTo(target) {
        var _this2 = this;

        target = this._menu.find($(target)).first();

        if (!target.length) return false;

        var parents = target.parents('ul');
        var level = parents.length - 1;

        if (level === 0) return false;

        this._pauseAnimations(function () {
          _this2._level = level;
          parents.show().first().addClass('active');
          _this2._triggerAnimation(_this2._slider, -_this2._level * 100);
        });
      }
    }, {
      key: '_createMenuFromItems',
      value: function _createMenuFromItems(items) {
        var that = this;
        var $ul = $('<ul/>');
        items.forEach(function (item) {
          $ul.append(that._createMenuItemFromObj(item));
        });
        return $ul;
      }
    }, {
      key: '_createMenuItemFromObj',
      value: function _createMenuItemFromObj(a) {
        var that = this;
        var $li = $('<li/>');
        var $a = $('<a/>').attr({
          href: a.href,
          title: a.title
        }).text(a.title);
        if (a[that.options.dynamicSourceDataAttribute]) {
          $a.data(that.options.dynamicSourceDataAttribute, a[that.options.dynamicSourceDataAttribute]);
        }
        $li.append($a);
        if (a.items && a.items.length) {
          $li.append(that._createMenuFromItems(a.items));
        }
        return $li;
      }
    }, {
      key: '_isAnchorDynamic',
      value: function _isAnchorDynamic(anchor) {
        return anchor.data(this.options.dynamicSourceDataAttribute) !== undefined && this.options.dynamicSourceFetchFunction != null;
      }
    }, {
      key: '_fetchDynamicItems',
      value: function _fetchDynamicItems(anchor) {
        // if the clicked anchor has data function attribute, remove loading ul/li
        var that = this,
            fetched_attr = 'source-fetched';
        if (this._isAnchorDynamic(anchor) && !anchor.data(fetched_attr)) {
          // do ajax call
          var $ul = anchor.next('ul');
          if ($ul.find('.loading').length) {
            var fetching = this.options.dynamicSourceFetchFunction.call(this, anchor.data(this.options.dynamicSourceDataAttribute));
            anchor.removeData(that.options.dynamicSourceDataAttribute);
            anchor.data(fetched_attr, true);
            fetching.then(function (list) {
              list.forEach(function (a) {
                $ul.append(that._createMenuItemFromObj(a));
              });
              $ul.find('.loading').remove();
              that._update();
            });
          }
        }
      }

      /**
       * Set up all event handlers
       * @private
       */

    }, {
      key: '_setupEventHandlers',
      value: function _setupEventHandlers() {
        var _this3 = this;

        // if there's at least one anchor
        if (this._hasMenu) {
          // bind a click event handler to all of the anchors
          this._anchors.each(function (i, a) {
            a = $(a);
            if (!a.data('events-processed')) {
              a.data('events-processed', true);
              a.click(function (event) {
                var anchor = $(event.target).is('a') ? $(event.target) : $(event.target).parents('a:first');

                _this3._fetchDynamicItems(anchor);
                // call navigate to slide the menu one step right
                _this3._navigate(anchor);
              });
            }
          });
        }

        // for each menu, add
        // console.log('WHAT IS SLIDER', this._slider);
        // console.log('WHAT IS MENU', this._menu);
        // console.log('WHAT IS THIS', $(this._menu.add(this._slider)));
        // select both this._menu and this._slider and add an event listener that listens for transitionend event
        $(this._menu.add(this._slider)).on('transitionend msTransitionEnd', function () {
          // when the listener events are triggered, set this._isAnimating to false
          _this3._isAnimating = false;
          //
          _this3._triggerEvent(true);
        });

        $(document).keydown(function (e) {
          switch (e.which) {
            case _this3.options.keycodeClose:
              _this3.close();
              break;

            case _this3.options.keycodeOpen:
              _this3.open();
              break;

            default:
              return;
          }
          e.preventDefault();
        });

        this._menu.on('sm.back-after', function () {
          var lastActiveUl = 'ul ' + '.active '.repeat(_this3._level + 1);
          _this3._menu.find(lastActiveUl).removeClass('active').hide();
        });
      }

      /**
       * Trigger a custom event to support callbacks
       * @param {boolean} afterAnimation Mark this event as `before` or `after` callback
       * @private
       */

    }, {
      key: '_triggerEvent',
      value: function _triggerEvent() {
        var afterAnimation = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

        var eventName = 'sm.' + this._lastAction;
        if (afterAnimation) eventName += '-after';
        this._menu.trigger(eventName);
      }

      /**
       * Navigate the _menu - that is slide it one step left or right
       * @param {jQuery} anchor The clicked anchor or button element
       * @param {int} dir Navigation direction: 1 = forward, 0 = backwards
       * @private
       */

    }, {
      key: '_navigate',
      value: function _navigate(anchor) {
        var dir = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

        this._menu.scrollTop(0);

        // console.log('NAVIGATING', anchor, dir);
        // Abort if an animation is still running
        if (this._isAnimating) {
          return;
        }

        var offset = (this._level + dir) * -100;

        if (dir > 0) {
          if (!anchor.next('ul').length) {
            this.close();
            return;
          };

          anchor.next('ul').addClass('active').show();
        } else if (this._level === 0) {
          return;
        }

        this._lastAction = dir > 0 ? 'forward' : 'back';
        this._level = this._level + dir;

        this._triggerAnimation(this._slider, offset);
      }

      /**
       * Start the animation (the CSS transition)
       * @param elem
       * @param offset
       * @private
       */

    }, {
      key: '_triggerAnimation',
      value: function _triggerAnimation(elem, offset) {
        this._triggerEvent();

        if (!(String(offset).indexOf('%') !== -1)) offset += '%';

        elem.css('transform', 'translateX(' + offset + ')');
        this._isAnimating = true;
      }

      /**
       * Initialize the menu
       * @private
       */

    }, {
      key: '_setupMenu',
      value: function _setupMenu() {
        var _this4 = this;

        this._pauseAnimations(function () {
          switch (_this4.options.position) {
            case 'left':
              _this4._menu.css({
                left: 0,
                right: 'auto',
                transform: 'translateX(-100%)'
              });
              break;
            default:
              _this4._menu.css({
                left: 'auto',
                right: 0
              });
              break;
          }
          _this4._menu.show();
        });
      }

      /**
       * Pause the CSS transitions, to apply CSS changes directly without an animation
       * @param work
       * @private
       */

    }, {
      key: '_pauseAnimations',
      value: function _pauseAnimations(work) {
        this._menu.addClass('no-transition');
        work();
        this._menu[0].offsetHeight; // trigger a reflow, flushing the CSS changes
        this._menu.removeClass('no-transition');
      }
    }, {
      key: '_processDynamicAnchor',
      value: function _processDynamicAnchor(anchor) {
        if (this._isAnchorDynamic(anchor)) {
          // add sibling ul with child loading li
          //let's make the ul to store dynamic links
          var $ul = $('<ul/>');
          $ul.append($('<li/>').addClass('loading').html(this.options.dynamicLoadingContent));
          anchor.after($ul);
        }
      }

      /**
       * Enhance the markup of menu items which contain a submenu
       * @private
       */

    }, {
      key: '_setupSubmenus',
      value: function _setupSubmenus() {
        var _this5 = this;

        this._anchors.each(function (i, anchor) {
          anchor = $(anchor);
          // check if anchor.data('processed') is false
          // check if anchor.data('function')
          // anchor click bind event handler
          // inject ul
          // if anchor has data-processed attribute set to false, set it to true
          if (anchor.data('submenu-processed') === undefined) {

            //process the anchor to see if it has dynamic source for its submenu
            _this5._processDynamicAnchor(anchor);

            // check if there's a ul sibling next to anchor
            if (anchor.next('ul').length) {
              // prevent default behaviour (use link just to navigate)
              anchor.click(function (ev) {
                ev.preventDefault();
              });

              // add `before` and `after` text
              var anchorTitle = anchor.html();
              anchor.html(_this5.options.submenuLinkBefore + anchorTitle + _this5.options.submenuLinkAfter);

              // add a back button
              if (_this5.options.showBackLink) {
                var backLink = $('<a href class="slide-menu-control" data-action="back">' + anchorTitle + '</a>');

                backLink.html(_this5.options.backLinkBefore + backLink.html() + _this5.options.backLinkAfter);
                anchor.next('ul').prepend($('<li>').append(backLink));
              }
            }
            //mark this anchor as processed so it doesn't get set again on update
            anchor.data('submenu-processed', true);
          }
        });
      }
    }, {
      key: '_update',
      value: function _update() {
        this._anchors = this._menu.find('a');
        this._hasMenu = this._anchors.length > 0;
        this._setupEventHandlers();
        this._setupSubmenus();
      }
    }]);

    return SlideMenu;
  }();

  // Link control buttons with the API


  $('body').on('click', '.slide-menu-control', function (e) {
    var menu = void 0;
    var target = $(this).data('target');

    if (!target || target === 'this') {
      menu = $(this).parents('.slide-menu:first');
    } else {
      menu = $('#' + target);
    }

    if (!menu.length) return;

    var instance = menu.data(PLUGIN_NAME);
    var action = $(this).data('action');

    if (instance && typeof instance[action] === 'function') {
      instance[action]();
    }

    return false;
  });

  // Register the jQuery plugin
  $.fn[PLUGIN_NAME] = function (options) {
    if (!$(this).length) {
      console.warn('Slide Menu: Unable to find menu DOM element. Maybe a typo?');
      return;
    }

    options = $.extend({}, DEFAULT_OPTIONS, options);
    options.elem = $(this);

    var instance = new SlideMenu(options);
    $(this).data(PLUGIN_NAME, instance);

    return instance;
  };
})(jQuery);
//# sourceMappingURL=slide-menu.js.map
