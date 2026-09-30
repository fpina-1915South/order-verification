/* 1915 South Order Verification settings.
   Uses the same Firebase project as the Smart Scheduler, so sign-in and the Access list are shared.
   These values are safe to publish. Access is controlled by firestore.rules, not by keeping these secret. */
window.OV_CONFIG = {
  firebase: {
    apiKey: "AIzaSyDLeBfi4LrYtkXxS9fh9BPf40NcPIsIqQA",
    authDomain: "smart-scheduler-1915.firebaseapp.com",
    projectId: "smart-scheduler-1915",
    storageBucket: "smart-scheduler-1915.firebasestorage.app",
    messagingSenderId: "1678890298",
    appId: "1:1678890298:web:483e73dbcf5b7f7875ac03"
  },
  ownerEmail: "fpina@1915south.com",   // must match OWNER in firestore.rules
  allowedDomain: "1915south.com",      // only emails at this domain can sign in and submit
  /* Who also gets the "All stores" view in Store Records. (Every signed-in leader can look up any single store.) */
  viewers: ["ocruz@1915south.com", "jmccord@1915south.com", "msevert@1915south.com", "jkeene@1915south.com", "sdance@1915south.com", "ebrickner@1915south.com", "kwilliams@1915south.com",
    /* Exec team */ "jwoods@1915south.com", "bsmallwood@1915south.com", "ahall@1915south.com", "lodom@1915south.com", "anohelty@1915south.com"]
};
