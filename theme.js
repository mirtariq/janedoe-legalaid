/**
 * LegalAtoms Legal Aid: presentation effects.
 * Word-by-word reveals, sticky header height, and the team spotlight.
 * All motion is skipped when the visitor prefers reduced motion.
 */
( function () {
	'use strict';

	var reduceMotion = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
	var root = document.documentElement;
	root.classList.add( 'has-js' );

	// Expose the sticky header height so sticky sections can sit below it.
	function setHeaderHeight() {
		var header = document.querySelector( 'header.wp-block-template-part' );
		if ( header ) {
			root.style.setProperty( '--site-header-h', header.offsetHeight + 'px' );
		}
	}
	setHeaderHeight();
	window.addEventListener( 'resize', setHeaderHeight );

	// The header stays transparent and borrows the color of whatever
	// section is passing beneath it.
	var siteHeader = document.querySelector( '.site-header' );
	function luminance( rgb ) {
		var m = rgb.match( /\d+(\.\d+)?/g );
		if ( ! m || m.length < 3 ) {
			return 1;
		}
		return ( 0.2126 * m[ 0 ] + 0.7152 * m[ 1 ] + 0.0722 * m[ 2 ] ) / 255;
	}
	function sampleHeaderBackground() {
		if ( ! siteHeader ) {
			return;
		}
		var rect = siteHeader.getBoundingClientRect();
		siteHeader.style.pointerEvents = 'none';
		var el = document.elementFromPoint( Math.round( rect.left + rect.width / 2 ), Math.round( rect.bottom + 1 ) );
		siteHeader.style.pointerEvents = '';
		var bg = '';
		while ( el && el !== document.documentElement ) {
			var c = window.getComputedStyle( el ).backgroundColor;
			if ( c && c !== 'transparent' && c !== 'rgba(0, 0, 0, 0)' ) {
				bg = c;
				break;
			}
			el = el.parentElement;
		}
		if ( ! bg ) {
			bg = window.getComputedStyle( document.body ).backgroundColor;
		}
		siteHeader.style.backgroundColor = bg;
		siteHeader.classList.toggle( 'is-on-dark', luminance( bg ) < 0.45 );
	}
	sampleHeaderBackground();
	window.addEventListener( 'scroll', sampleHeaderBackground, { passive: true } );
	window.addEventListener( 'resize', sampleHeaderBackground );
	window.addEventListener( 'load', sampleHeaderBackground );

	// Service tiles: opening one closes the others in the same section.
	Array.prototype.forEach.call( document.querySelectorAll( '.services, .quick-actions' ), function ( section ) {
		var tiles = section.querySelectorAll( 'details.service-tile' );
		Array.prototype.forEach.call( tiles, function ( tile ) {
			tile.addEventListener( 'toggle', function () {
				if ( tile.open ) {
					Array.prototype.forEach.call( tiles, function ( other ) {
						if ( other !== tile ) {
							other.open = false;
						}
					} );
				}
			} );
		} );
	} );

	// Jump menus: go to the page chosen in the dropdown.
	Array.prototype.forEach.call( document.querySelectorAll( 'form.jump-menu' ), function ( form ) {
		form.addEventListener( 'submit', function ( event ) {
			var select = form.querySelector( 'select' );
			if ( select && select.value ) {
				event.preventDefault();
				window.location.href = select.value;
			}
		} );
	} );

	if ( reduceMotion || ! ( 'IntersectionObserver' in window ) ) {
		root.classList.add( 'no-reveal' );
		return;
	}

	// Wrap each word so it can fade in with a small delay.
	function splitWords( el ) {
		if ( el.querySelector( 'img, svg, input' ) || el.dataset.split ) {
			return;
		}
		el.dataset.split = '1';
		var index = 0;
		var walker = document.createTreeWalker( el, NodeFilter.SHOW_TEXT, null );
		var nodes = [];
		while ( walker.nextNode() ) {
			nodes.push( walker.currentNode );
		}
		nodes.forEach( function ( node ) {
			var parts = node.nodeValue.split( /(\s+)/ );
			var frag = document.createDocumentFragment();
			parts.forEach( function ( part ) {
				if ( ! part ) {
					return;
				}
				if ( /^\s+$/.test( part ) ) {
					frag.appendChild( document.createTextNode( part ) );
					return;
				}
				var span = document.createElement( 'span' );
				span.className = 'reveal-word';
				span.style.setProperty( '--i', index++ );
				span.textContent = part;
				frag.appendChild( span );
			} );
			node.parentNode.replaceChild( frag, node );
		} );
	}

	var revealTargets = document.querySelectorAll(
		'main h1, main h2, main .has-dot, .wp-block-post-content h1, .wp-block-post-content h2'
	);
	Array.prototype.forEach.call( revealTargets, function ( el ) {
		el.classList.add( 'reveal-words' );
		splitWords( el );
	} );

	var observer = new IntersectionObserver(
		function ( entries ) {
			entries.forEach( function ( entry ) {
				if ( entry.isIntersecting ) {
					entry.target.classList.add( 'is-revealed' );
					observer.unobserve( entry.target );
				}
			} );
		},
		{ threshold: 0.25 }
	);
	Array.prototype.forEach.call( revealTargets, function ( el ) {
		observer.observe( el );
	} );

	// Intro: the site name starts large in the middle of the screen and
	// shrinks into the header as the visitor starts to scroll.
	var hero = document.querySelector( '.hero' );
	var title = siteHeader ? siteHeader.querySelector( '.wp-block-site-title' ) : null;
	if ( hero && title && window.innerWidth > 781 ) {
		root.classList.add( 'has-intro' );
		var introScale = Math.min( 4.2, ( window.innerWidth * 0.6 ) / Math.max( 1, title.getBoundingClientRect().width ) );
		function introFrame() {
			var progress = Math.min( 1, Math.max( 0, window.scrollY / ( window.innerHeight * 0.45 ) ) );
			var p = 1 - progress;
			title.style.transform = 'none';
			var r = title.getBoundingClientRect();
			var scale = 1 + p * ( introScale - 1 );
			var dx = ( window.innerWidth / 2 - ( r.width * scale ) / 2 ) - r.left;
			var dy = window.innerHeight / 2 - ( r.top + r.height / 2 );
			title.style.transform = 'translate(' + ( dx * p ) + 'px, ' + ( dy * p ) + 'px) scale(' + scale + ')';
			root.style.setProperty( '--intro-p', p );
			siteHeader.classList.toggle( 'is-intro', progress < 1 );
		}
		introFrame();
		window.addEventListener( 'scroll', introFrame, { passive: true } );
		window.addEventListener( 'resize', introFrame );
	}

	// Statement: words light up one after another as the block scrolls up.
	var statements = document.querySelectorAll( '.statement' );
	Array.prototype.forEach.call( statements, function ( block ) {
		Array.prototype.forEach.call( block.querySelectorAll( 'p' ), splitWords );
		var words = block.querySelectorAll( '.reveal-word' );
		var total = words.length;
		var lastCount = -1;
		function statementFrame() {
			var r = block.getBoundingClientRect();
			var vh = window.innerHeight;
			var progress = ( vh * 0.85 - r.top ) / ( r.height + vh * 0.2 );
			progress = Math.min( 1, Math.max( 0, progress ) );
			var count = Math.round( progress * total );
			if ( count === lastCount ) {
				return;
			}
			lastCount = count;
			for ( var i = 0; i < total; i++ ) {
				words[ i ].classList.toggle( 'is-on', i < count );
			}
		}
		statementFrame();
		window.addEventListener( 'scroll', statementFrame, { passive: true } );
	} );

	// Values: cards stack. A card fades in as it rises; once it reaches the
	// bottom edge of the card above, that card disappears.
	Array.prototype.forEach.call( document.querySelectorAll( '.values-stack' ), function ( stack ) {
		var cards = stack.querySelectorAll( '.value-card' );
		function stackFrame() {
			var vh = window.innerHeight;
			var prev = null;
			Array.prototype.forEach.call( cards, function ( card, i ) {
				var r = card.getBoundingClientRect();
				var fade = i === 0 ? 1 : Math.min( 1, Math.max( 0, ( vh - r.top ) / ( vh * 0.25 ) ) );
				card.style.opacity = fade;
				if ( prev ) {
					prev.classList.toggle( 'is-passed', r.top <= prev.getBoundingClientRect().bottom + 1 );
				}
				prev = card;
			} );
		}
		stackFrame();
		window.addEventListener( 'scroll', stackFrame, { passive: true } );
		window.addEventListener( 'resize', stackFrame );
	} );

	// Team spotlight: highlight the name nearest the middle of the screen
	// and show that person's picture in the sticky frame.
	Array.prototype.forEach.call( document.querySelectorAll( '.team-spotlight' ), function ( section ) {
		var members = section.querySelectorAll( '.team-member' );
		var frame = section.querySelector( '.team-spotlight__frame img' );
		var halftone = section.querySelector( '.team-spotlight__halftone img' );
		if ( ! members.length || ! frame ) {
			return;
		}
		var active = null;

		function activate( member ) {
			if ( member === active ) {
				return;
			}
			active = member;
			Array.prototype.forEach.call( members, function ( m ) {
				m.classList.toggle( 'is-active', m === member );
			} );
			var img = member.querySelector( 'img' );
			if ( img ) {
				frame.src = img.currentSrc || img.src;
				frame.alt = img.alt;
				if ( halftone ) {
					halftone.src = frame.src;
				}
			}
			var tag = section.querySelector( '.team-spotlight__role' );
			var role = member.querySelector( '.team-member__role' );
			if ( tag && role ) {
				tag.textContent = role.textContent;
			}
		}

		function update() {
			var mid = window.innerHeight / 2;
			var best = null;
			var bestDist = Infinity;
			Array.prototype.forEach.call( members, function ( m ) {
				var r = m.getBoundingClientRect();
				var dist = Math.abs( r.top + r.height / 2 - mid );
				if ( dist < bestDist ) {
					bestDist = dist;
					best = m;
				}
			} );
			if ( best ) {
				activate( best );
			}
		}

		var ticking = false;
		window.addEventListener( 'scroll', function () {
			if ( ! ticking ) {
				window.requestAnimationFrame( function () {
					update();
					ticking = false;
				} );
				ticking = true;
			}
		}, { passive: true } );
		update();
	} );
} )();
