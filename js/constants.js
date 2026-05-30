const APP = {
  version: "1.0.6"
};

const CAT_COLORS = ["#3a9c3a","#2980b9","#8e44ad","#c0392b","#d35400","#16a085","#f39c12"];

/* ══════════════════════════════════════════════════════
   DEFAULT AGE CATEGORIES CONFIG
══════════════════════════════════════════════════════ */
const DEFAULT_CONFIG = {
  "2025": [
    { name: "U7",  fromYear: 2019, toYear: null },
    { name: "U9",  fromYear: 2017, toYear: 2018 },
    { name: "U11", fromYear: 2015, toYear: 2016 },
    { name: "U13", fromYear: 2013, toYear: 2014 },
    { name: "U15", fromYear: 2011, toYear: 2012 },
    { name: "U19", fromYear: 2007, toYear: 2010 }
  ],
  "2026": [
    { name: "U7",  fromYear: 2020, toYear: null },
    { name: "U9",  fromYear: 2018, toYear: 2019 },
    { name: "U11", fromYear: 2016, toYear: 2017 },
    { name: "U13", fromYear: 2014, toYear: 2015 },
    { name: "U15", fromYear: 2012, toYear: 2013 },
    { name: "U19", fromYear: 2008, toYear: 2011 }
  ]
};