/*
 * NASA Worldview
 * 
 * This code was originally developed at NASA/Goddard Space Flight Center for
 * the Earth Science Data and Information System (ESDIS) project. 
 *
 * Copyright (C) 2013 United States Government as represented by the 
 * Administrator of the National Aeronautics and Space Administration.
 * All Rights Reserved.
 */

Worldview.namespace("Widget");

Worldview.Widget.ArcticProjectionChangeNotification = function(config, bank) { 
    
    var log = Logging.getLogger("Worldview.ArcticProjectionChangeNotification");
    //Logging.debug("Worldview.ArcticProjectionChangeNotification");
    
    var self = {};

    var visitOld = false;
    var visitNew = false;
    var currentNew = true;
    var showNotice = true;
    var storageEngine;
    
    var oldEPSG = "EPSG:3995";
    var newEPSG = "EPSG:3413";
    
    var oldCoastlinesRegEx = new RegExp("arctic_coastlines(?!_)");
    var newCoastlinesRegEx = new RegExp("arctic_coastlines_3413");
    var oldCoastlines = "arctic_coastlines";
    var newCoastlines = "arctic_coastlines_3413";
    
    var newGraticulesRegEx = new RegExp("arctic_graticule_3413");
    var oldGraticulesRegEx = new RegExp("polarview:graticuleN");
    var newGraticules = "arctic_graticule_3413";
    var oldGraticules = "polarview:graticuleN";
        
    self.containerId = "arcticProjectionChangeNotification";
    
    var init = function() {
        try {
            storageEngine = YAHOO.util.StorageManager.get(
                YAHOO.util.StorageEngineHTML5.ENGINE_NAME,
                YAHOO.util.StorageManager.LOCATION_LOCAL,
                {
                    force: false,
                    order: [
                        YAHOO.util.StorageEngineHTML5
                    ]
                });
        } catch (error) {
            log.error("Storage engine not available");
        }
                
        var changeDate = config.config.arcticProjectionChangeDate;
        if ( storageEngine && storageEngine.getItem(self.containerId) ) {
            log.debug(self.containerId + ": already notified");
            showNotice = false;
        }
        if ( changeDate ) {
            self.changeDate = Date.parseISOString(changeDate);
            REGISTRY.register(self.containerId, self);
            REGISTRY.markComponentReady(self.containerId);
            log.debug(self.containerId + ": watching");
        }
    };
    
    var updateLayers = function(queryString) {
        var products = Worldview.extractFromQuery("products", queryString);
        if ( currentNew ) {
            Worldview.Map.COORDINATE_CONTROLS["arctic"].projection = 
                newEPSG;
            products = products.replace(oldCoastlinesRegEx, newCoastlines);
            products = products.replace(oldGraticulesRegEx, newGraticules);

        } else {
            Worldview.Map.COORDINATE_CONTROLS["arctic"].projection = 
                oldEPSG;
            products = products.replace(newCoastlinesRegEx, oldCoastlines);
            products = products.replace(newGraticulesRegEx, oldGraticules);
        }
        log.debug(self.containerId + ": updateLayers", products); 
        bank.setValue(products);  
    }
    
    self.setValue = function() {};
    self.getValue = function() {};
    
    self.updateComponent = function(queryString) {
        log.debug(self.containerId + ": queryString", queryString);
        log.debug("LFQ: ", REGISTRY.isLoadingQuery);
        try {
            var query = Worldview.queryStringToObject(queryString);
            if ( query["switch"] === "arctic" ) {
                var currentDay = Date.parseISOString(query.time);
                if ( currentDay < self.changeDate ) {
                    log.debug(self.containerId + ": visit old");
                    if ( REGISTRY.isLoadingQuery ) {
                        log.debug("Reseting visit new");
                        visitNew = false;
                    }
                    visitOld = true;
                    if ( currentNew ) {
                        currentNew = false;
                        updateLayers(queryString);
                    }
                } else if ( currentDay >= self.changeDate ) {
                    log.debug(self.containerId + ": visit new");
                    visitNew = true;
                    if ( !currentNew ) {
                        currentNew = true;
                        updateLayers(queryString);
                    }
                }
                if ( visitOld && visitNew && showNotice ) {
                    log.debug(self.containerId + ": notify");
                    notify();
                    showNotice = false;                   
                }
            }
        } catch ( error ) {
            Worldview.error("Internal error", error);
        }
    };

    var notify = function() {
        dialog = new YAHOO.widget.Panel("arcticChangeNotification", {
            width: "300px",
            zIndex: 1020,
            visible: false,
            modal: true
        });
        dialog.setHeader("Notice");
        var body = [
            "On " + self.changeDate.toISOStringDate() + ", " ,
            "the arctic projection changed to NSIDC Sea Ice Polar ", 
            "Stereographic North (from EPSG:3995 to EPSG:3413).",
            "<br/><br/>",
            
            "The archive of near-real time data has not been reprocessed to ",
            "the new projection as this will be replaced with science quality ",
            "data in the future.",
            "<br/><br/>",
            
            "The Population Density and Global Label layers can no longer ", 
            "be displayed properly in the older projection.",
            "<br/><br/>",
            
            "<input id='arcticChangeNoticeDontShowAgain' value='false' ", 
                "type='checkbox'>Do not show again"
        ].join("");
        dialog.setBody(body);
        dialog.render(document.body);
        dialog.show();
        dialog.center();
        dialog.hideEvent.subscribe(function(i) {
            setTimeout(function() { 
                if ( $("#arcticChangeNoticeDontShowAgain").is(":checked") ) {
                    log.debug(self.containerId + ": Don't show again");
                    if ( storageEngine ) {
                        storageEngine.setItem(self.containerId, true);
                    }                    
                }
                dialog.destroy(); 
            }, 25);
        });
    };
    
    self.loadFromQuery = self.updateComponent;
            
    init();
    return self;    
};

