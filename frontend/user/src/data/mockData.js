/**
 * mockData.js — All demo data for DealFlow360
 * Ported from dealflow360.html mock data block
 */

export const catalog = [
  { id:'p1', name:'Orion Laptop 14"', cat:'Hardware',     price:1450, cost:1015, ceiling:15 },
  { id:'p2', name:'Onsite Setup Service', cat:'Services', price:600,  cost:480,  ceiling:10 },
  { id:'p3', name:'Extended Care Plan', cat:'Services',   price:220,  cost:150,  ceiling:10 },
  { id:'p4', name:'Docking Station', cat:'Hardware',      price:180,  cost:110,  ceiling:15 },
  { id:'p5', name:'Fleet Manager (Sub)', cat:'Subscription', price:39, cost:12,  ceiling:12 },
  { id:'p6', name:'Security Suite (Sub)', cat:'Subscription', price:24, cost:8,  ceiling:12 },
];

export const upsells = [
  { id:'u1', name:'Extended Care Plan', delta:'+$70 margin', tag:'Promoted' },
  { id:'u2', name:'Docking Station ×2', delta:'+$140 margin', tag:null },
];

export const stalledDeals = [
  { cust:'Marlowe & Finch',   amt:'$48,200', days:9,  rep:'S. Adeyemi' },
  { cust:'Halcyon Textiles',  amt:'$21,900', days:14, rep:'R. Okafor'  },
  { cust:'Bramwell Group',    amt:'$63,000', days:6,  rep:'J. Vance'   },
];

export const anomalies = [
  { cust:'Acme Corp',        note:'18% given on Services, 10% allowed',         level:'High'   },
  { cust:'Northwind Retail', note:'Blended overage across 4 lines',              level:'Medium' },
  { cust:'Sable & Co',       note:"Discount 3× rep's 90-day average",            level:'High'   },
];

export const pipelineData = {
  Draft:            [ { cust:'Widget Holdings', amt:'$12,400', rep:'S. Adeyemi' }, { cust:'Faircourt Ltd', amt:'$8,050', rep:'J. Vance' } ],
  'Pending Approval':[ { cust:'Acme Corp', amt:'$34,900', rep:'S. Adeyemi' }, { cust:'Northwind Retail', amt:'$19,200', rep:'R. Okafor' } ],
  Approved:         [ { cust:'Bramwell Group', amt:'$63,000', rep:'J. Vance' } ],
  Fulfillment:      [ { cust:'Delacroix Labs', amt:'$27,300', rep:'R. Okafor' } ],
  Billed:           [ { cust:'Sable & Co', amt:'$15,600', rep:'S. Adeyemi' } ],
};

export const SCREENS = {
  dashboard:     { title:'Deal Health',                  sub:'Real-time view across every open quotation' },
  pipeline:      { title:'Pipeline',                     sub:'Quotations by stage, from draft to billed' },
  builder:       { title:'Quotation Builder',            sub:'Build, discount, and route a quote in one pass' },
  approval:      { title:'Discount Approval',            sub:'Blended risk scoring and the approval chain' },
  fulfillment:   { title:'Fulfillment & Warehouse Split',sub:'Live stock-aware shipment planning' },
  subscriptions: { title:'Subscriptions & Billing',      sub:'One-time and recurring lines, reconciled' },
  portal:        { title:'Customer Portal',              sub:'Self-service quotation management and submission' },
};
