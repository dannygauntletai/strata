/**
 * TSA Analytics Tracking Script
 * Cross-domain analytics tracking for Texas Sports Academy
 * Version: 2.0.0
 */
(function(window, document) {
    'use strict';
    
    // Configuration - These will be dynamically replaced when script is generated
    const CONFIG = {
        TENANT_ID: '{{TENANT_ID}}',
        API_ENDPOINT: '{{API_ENDPOINT}}',
        TRACKING_DOMAINS: ['{{TRACKING_DOMAINS}}'], // Array of domains to sync with
        DEBUG: false
    };

    // Cross-domain ID management
    const CrossDomainTracker = {
        getXDomainId() {
            let xdid = this.getFromStorage('_tsa_xdid');
            if (!xdid) {
                xdid = this.generateUUID();
                this.setInStorage('_tsa_xdid', xdid);
            }
            return xdid;
        },

        getSessionId() {
            let sessionId = this.getFromStorage('_tsa_session');
            if (!sessionId) {
                sessionId = this.generateUUID();
                this.setInStorage('_tsa_session', sessionId, 30 * 60 * 1000); // 30 minutes
            }
            return sessionId;
        },

        getFromStorage(key) {
            try {
                const item = localStorage.getItem(key);
                if (!item) return null;
                
                const parsed = JSON.parse(item);
                if (parsed.expires && Date.now() > parsed.expires) {
                    localStorage.removeItem(key);
                    return null;
                }
                return parsed.value;
            } catch (e) {
                return null;
            }
        },

        setInStorage(key, value, expiresMs = null) {
            try {
                const item = {
                    value: value,
                    expires: expiresMs ? Date.now() + expiresMs : null
                };
                localStorage.setItem(key, JSON.stringify(item));
            } catch (e) {
                // Storage not available
            }
        },

        generateUUID() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        },

        syncAcrossDomains() {
            const xdid = this.getXDomainId();
            CONFIG.TRACKING_DOMAINS.forEach(domain => {
                if (domain && domain !== window.location.hostname) {
                    const iframe = document.createElement('iframe');
                    iframe.src = `https://${domain}/tsa-sync?xdid=${xdid}`;
                    iframe.style.display = 'none';
                    iframe.style.width = '1px';
                    iframe.style.height = '1px';
                    document.body.appendChild(iframe);
                    
                    // Remove iframe after sync
                    setTimeout(() => {
                        if (iframe.parentNode) {
                            iframe.parentNode.removeChild(iframe);
                        }
                    }, 5000);
                }
            });
        }
    };

    // Event tracking manager
    const EventTracker = {
        queue: [],
        isOnline: navigator.onLine !== false,

        track(eventType, properties = {}, options = {}) {
            const event = this.buildEvent(eventType, properties, options);
            
            if (CONFIG.DEBUG) {
                console.log('TSA Analytics:', event);
            }

            // Add to queue
            this.queue.push(event);

            // Send immediately if online, or queue for later
            if (this.isOnline) {
                this.flush();
            }
        },

        buildEvent(eventType, properties, options) {
            const now = new Date();
            
            return {
                tenant_id: CONFIG.TENANT_ID,
                event_type: eventType,
                event_id: CrossDomainTracker.generateUUID(),
                timestamp: now.toISOString(),
                user_id: properties.user_id || 'anonymous',
                session_id: CrossDomainTracker.getSessionId(),
                properties: {
                    ...this.getPageProperties(),
                    ...this.getUTMParameters(),
                    ...properties
                },
                context: {
                    page: {
                        url: window.location.href,
                        title: document.title,
                        referrer: document.referrer,
                        path: window.location.pathname,
                        search: window.location.search,
                        hash: window.location.hash
                    },
                    user: {
                        xdid: CrossDomainTracker.getXDomainId(),
                        anonymous_id: this.getAnonymousId(),
                        language: navigator.language,
                        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    },
                    device: this.getDeviceInfo(),
                    campaign: this.getCampaignInfo()
                },
                attribution: options.attribution || {}
            };
        },

        getPageProperties() {
            return {
                page_url: window.location.href,
                page_title: document.title,
                page_referrer: document.referrer
            };
        },

        getUTMParameters() {
            const params = new URLSearchParams(window.location.search);
            const utm = {};
            
            ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(param => {
                const value = params.get(param);
                if (value) {
                    utm[param] = value;
                }
            });
            
            return utm;
        },

        getAnonymousId() {
            let anonId = CrossDomainTracker.getFromStorage('_tsa_anon_id');
            if (!anonId) {
                anonId = CrossDomainTracker.generateUUID();
                CrossDomainTracker.setInStorage('_tsa_anon_id', anonId);
            }
            return anonId;
        },

        getDeviceInfo() {
            const userAgent = navigator.userAgent;
            return {
                user_agent: userAgent,
                screen_width: window.screen ? window.screen.width : null,
                screen_height: window.screen ? window.screen.height : null,
                viewport_width: window.innerWidth,
                viewport_height: window.innerHeight,
                pixel_ratio: window.devicePixelRatio || 1,
                touch_support: 'ontouchstart' in window
            };
        },

        getCampaignInfo() {
            const params = new URLSearchParams(window.location.search);
            return {
                utm_source: params.get('utm_source'),
                utm_medium: params.get('utm_medium'),
                utm_campaign: params.get('utm_campaign'),
                utm_term: params.get('utm_term'),
                utm_content: params.get('utm_content'),
                gclid: params.get('gclid'), // Google Ads
                fbclid: params.get('fbclid') // Facebook Ads
            };
        },

        flush() {
            if (this.queue.length === 0) return;

            const events = this.queue.splice(0, 25); // Send up to 25 events at once
            this.sendEvents(events);
        },

        sendEvents(events) {
            const payload = {
                events: events
            };

            // Use sendBeacon if available (more reliable)
            if (navigator.sendBeacon) {
                const success = navigator.sendBeacon(
                    CONFIG.API_ENDPOINT + '/admin/analytics/events/batch',
                    JSON.stringify(payload)
                );
                
                if (!success) {
                    // Fallback to fetch
                    this.sendViaFetch(payload);
                }
            } else {
                this.sendViaFetch(payload);
            }
        },

        sendViaFetch(payload) {
            fetch(CONFIG.API_ENDPOINT + '/admin/analytics/events/batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
                keepalive: true
            }).catch(error => {
                if (CONFIG.DEBUG) {
                    console.error('TSA Analytics fetch error:', error);
                }
                // Add back to queue for retry
                this.queue.push(...payload.events);
            });
        }
    };

    // Auto-tracking features
    const AutoTracker = {
        init() {
            this.trackPageView();
            this.setupClickTracking();
            this.setupFormTracking();
            this.setupScrollTracking();
            this.setupVisibilityTracking();
        },

        trackPageView() {
            EventTracker.track('page_view', {
                page_load_time: window.performance ? window.performance.now() : null
            });
        },

        setupClickTracking() {
            document.addEventListener('click', (event) => {
                const element = event.target;
                
                // Track links
                if (element.tagName === 'A') {
                    EventTracker.track('link_click', {
                        link_url: element.href,
                        link_text: element.textContent.trim(),
                        external: element.hostname !== window.location.hostname
                    });
                }

                // Track buttons
                if (element.tagName === 'BUTTON' || element.type === 'button') {
                    EventTracker.track('button_click', {
                        button_text: element.textContent.trim(),
                        button_class: element.className
                    });
                }

                // Track data-tracked elements
                if (element.dataset.track) {
                    EventTracker.track(element.dataset.track, {
                        element_text: element.textContent.trim(),
                        element_class: element.className,
                        element_id: element.id
                    });
                }
            });
        },

        setupFormTracking() {
            document.addEventListener('submit', (event) => {
                const form = event.target;
                if (form.tagName === 'FORM') {
                    const formData = new FormData(form);
                    const fields = {};
                    
                    for (let [key, value] of formData.entries()) {
                        // Don't track sensitive data
                        if (!key.includes('password') && !key.includes('ssn') && !key.includes('credit')) {
                            fields[key] = typeof value === 'string' ? value.substring(0, 100) : value;
                        }
                    }

                    EventTracker.track('form_submit', {
                        form_id: form.id,
                        form_name: form.name,
                        form_fields: Object.keys(fields),
                        form_action: form.action
                    });
                }
            });
        },

        setupScrollTracking() {
            let maxScroll = 0;
            let scrollTimer = null;

            window.addEventListener('scroll', () => {
                const scrollPercent = Math.round(
                    (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
                );
                
                if (scrollPercent > maxScroll) {
                    maxScroll = scrollPercent;
                }

                clearTimeout(scrollTimer);
                scrollTimer = setTimeout(() => {
                    // Track scroll milestones
                    if (maxScroll >= 25 && !this.scrollMilestones.quarter) {
                        this.scrollMilestones.quarter = true;
                        EventTracker.track('scroll_depth', { depth: 25 });
                    }
                    if (maxScroll >= 50 && !this.scrollMilestones.half) {
                        this.scrollMilestones.half = true;
                        EventTracker.track('scroll_depth', { depth: 50 });
                    }
                    if (maxScroll >= 75 && !this.scrollMilestones.threeQuarter) {
                        this.scrollMilestones.threeQuarter = true;
                        EventTracker.track('scroll_depth', { depth: 75 });
                    }
                    if (maxScroll >= 90 && !this.scrollMilestones.ninety) {
                        this.scrollMilestones.ninety = true;
                        EventTracker.track('scroll_depth', { depth: 90 });
                    }
                }, 500);
            });
        },

        scrollMilestones: {
            quarter: false,
            half: false,
            threeQuarter: false,
            ninety: false
        },

        setupVisibilityTracking() {
            let startTime = Date.now();

            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    const timeOnPage = Date.now() - startTime;
                    EventTracker.track('page_exit', {
                        time_on_page: timeOnPage,
                        scroll_depth: this.getMaxScrollDepth()
                    });
                } else {
                    startTime = Date.now();
                }
            });

            // Track when user leaves page
            window.addEventListener('beforeunload', () => {
                const timeOnPage = Date.now() - startTime;
                EventTracker.track('page_unload', {
                    time_on_page: timeOnPage,
                    scroll_depth: this.getMaxScrollDepth()
                });
                EventTracker.flush();
            });
        },

        getMaxScrollDepth() {
            return Math.round(
                (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
            );
        }
    };

    // Public API
    window.tsaAnalytics = {
        track: EventTracker.track.bind(EventTracker),
        identify: function(userId, traits = {}) {
            CrossDomainTracker.setInStorage('_tsa_user_id', userId);
            EventTracker.track('identify', {
                user_id: userId,
                traits: traits
            });
        },
        page: function(name, properties = {}) {
            EventTracker.track('page_view', {
                page_name: name,
                ...properties
            });
        },
        conversion: function(event, value = null, currency = 'USD') {
            EventTracker.track('conversion', {
                conversion_event: event,
                conversion_value: value,
                currency: currency
            });
        },
        ecommerce: function(action, products = []) {
            EventTracker.track('ecommerce', {
                action: action,
                products: products
            });
        },
        flush: EventTracker.flush.bind(EventTracker),
        debug: function(enabled = true) {
            CONFIG.DEBUG = enabled;
        }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            AutoTracker.init();
            CrossDomainTracker.syncAcrossDomains();
        });
    } else {
        AutoTracker.init();
        CrossDomainTracker.syncAcrossDomains();
    }

    // Handle online/offline events
    window.addEventListener('online', () => {
        EventTracker.isOnline = true;
        EventTracker.flush();
    });

    window.addEventListener('offline', () => {
        EventTracker.isOnline = false;
    });

    // Periodic flush for queued events
    setInterval(() => {
        if (EventTracker.isOnline && EventTracker.queue.length > 0) {
            EventTracker.flush();
        }
    }, 30000); // Every 30 seconds

})(window, document); 