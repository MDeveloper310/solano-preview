/* =====================================================================
   Scroll California: site settings. EDIT THIS FILE, nothing else.
   Every value here is safe to be public. Do NOT put secret keys here.
   ===================================================================== */
window.SC_CONFIG = {
  /* 1) Visit + sponsor-click tracking. NOT CONNECTED.
     Leave "" and nothing is sent anywhere. Set to a URL that accepts
     POST JSON (e.g. a Plausible/Umami-style collector or your own
     serverless function) to switch it on. See README.md > Tracking. */
  trackEndpoint: "",

  /* 2) Forms (submit a spot, advertise inquiry). Uses the same FormSubmit
     email relay the old site used, so submissions go to Carlos's inbox.
     Not test-submitted during the rebuild (that would send an email).
     Set to "" to disable and show the Instagram fallback instead. */
  formEndpoint: "https://formsubmit.co/ajax/dd668362a53c8f8c38bcc1fdba5c473c",

  /* 3) Newsletter. NOT CONNECTED to a newsletter tool yet.
     While "" the signup is sent through formEndpoint (subject
     "Newsletter signup") so emails are still collected in the inbox.
     Put a beehiiv/ConvertKit/Buttondown form-post URL here later. */
  newsletterEndpoint: "",

  /* 4) Stripe Payment Link for sponsor packages. NOT SET.
     While "" the Pay button on /advertise/ stays hidden. */
  stripeLink: "",

  /* 5) Contact fallbacks shown when a form can't be sent. */
  instagram: "https://www.instagram.com/crenshawvisuals/",

  /* 6) Sponsors. EMPTY = every "Sponsored" slot stays hidden.
     Only add a real, paying sponsor who agreed to the placement.
     Example (copy, fill in, remove the // ):
     // { id:"acme-2026-11", name:"Acme Tacos", url:"https://acme.example",
     //   text:"Tuesday taco night, 4-9pm", image:"/media/sponsors/acme.jpg",
     //   video:"", poster:"",            // optional 9:16 mp4 for a feed card
     //   slots:["feed","home","city:vacaville","place:*","category:restaurants"],
     //   start:"2026-11-01", end:"2026-11-30" }
  */
  sponsors: [],
  feedSponsorEvery: 5   /* a sponsor card after every N videos (only if a "feed" sponsor exists) */
};
