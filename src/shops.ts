// ============================================================================
// shops.ts  —  CONTENT PACKS for "Boss for a Day".
// One ShopPack per business. Every per-shop WORD lives here: the owner, the
// questions, the answer buttons, the lessons, the outcome lines, the goals.
// The 3D look (colors, the case, the shelves, the owner figure) is handled in
// environment.ts, switched by the shop's id. NOTHING reads this file yet; it is
// the backbone the picker (Stage 2) and the panels (Stage 3) will plug into.
// To change any wording for any shop later, this is the one place to edit.
// ============================================================================

export type ShopId = "bakery" | "surf" | "repair";

export interface ShopPack {
  id: ShopId;
  shopName: string;        // on the storefront sign and in the greeting
  subtitle: string;        // the line under "Boss for a Day" on the title card
  premise: string;         // the first welcome card: what today is
  ownerName: string;       // the owner who left you in charge
  ownerGreeting: string;   // the speech bubble above the owner

  // The 2D panel palette for this shop, used by the picker and Stage 3 panels.
  theme: {
    panelBg: string;
    panelBorder: string;
    ink: string;
    accent: string;
    accentInk: string;
    boxBg: string;
    boxBorder: string;
  };

  // The goal line in the corner at each handoff. Three of these name the owner.
  goals: {
    sayHi: string;
    morningCounter: string;
    middayFind: string;
    middayFloor: string;
    afternoonFind: string;
    closeCounter: string;
  };

  morning: {
    gusQ: string; gusBest: string; gusB: string; gusC: string; gusLesson: string;
    priceQ: string; stockQ: string; readyText: string;
    priceP: string; priceF: string; priceB: string;
    stockFancy: string; stockMix: string; stockBulk: string;
  };

  midday: {
    gusQ: string; gusBest: string; gusB: string; gusC: string; gusLesson: string;
    rivalQ: string; rivalHold: string; rivalMatch: string; rivalIgnore: string;
    compQ: string; compFree: string; compDiscount: string; compFirm: string;
    doneText: string;
  };

  afternoon: {
    gusQ: string; gusBest: string; gusB: string; gusC: string; gusLesson: string;
    leftoverQ: string; leftDonate: string; leftMarkdown: string; leftToss: string;
    orderQ: string; orderP: string; orderF: string; orderFriendly: string;
    doneText: string;
  };
}

// ----------------------------------------------------------------------------
// SHOP 1 — Sweet Capital Bakery (Cary Street, Richmond) — owner Ms. Delia
// ----------------------------------------------------------------------------
const BAKERY: ShopPack = {
  id: "bakery",
  shopName: "Sweet Capital Bakery",
  subtitle: "A Day at Sweet Capital Bakery",
  premise: "The owner of Sweet Capital Bakery, on Cary Street in Richmond, is taking the day off and left you in charge. For one day you will set prices, help customers, and make big calls to keep the shop thriving.",
  ownerName: "Ms. Delia",
  ownerGreeting: "Welcome to Sweet Capital Bakery! I'm Ms. Delia. The shop is yours today. Come find me whenever you want to talk a decision through.",
  theme: {
    panelBg: "#f3e9d2", panelBorder: "#5b3a24", ink: "#5b3a24",
    accent: "#d98a8f", accentInk: "#5b3a24", boxBg: "#fdf3dd", boxBorder: "#e3a9a2",
  },
  goals: {
    sayHi: "Walk over and say hi to Ms. Delia.",
    morningCounter: "Now go to your counter to set your prices and stock.",
    middayFind: "The lunch rush is starting. Go find Ms. Delia.",
    middayFloor: "Now go to your shop floor and take care of the lunch rush.",
    afternoonFind: "The afternoon brings a big chance. Go find Ms. Delia.",
    closeCounter: "Now go to your counter to close out the day.",
  },
  morning: {
    gusQ: "A flour seller offers a giant pallet at a big discount, far more than we need for today. What is your call?",
    gusBest: "Buy a fair amount. Enough to save money, but not so much it sits unused.",
    gusB: "Grab the whole pallet! A discount is always worth it.",
    gusC: "Skip it, and just keep what we have.",
    gusLesson: "The discount only helps if you can actually use it. A fair amount saves money without wasting flour or cash. Nice judgment.",
    priceQ: "How do you price the bakery's treats this morning?",
    stockQ: "What do you bake the most of today?",
    readyText: "Your prices are set and your cases are full. Time to open the doors!",
    priceP: "Premium prices. Charge more for top dollar.",
    priceF: "Fair prices. A solid deal for everyone.",
    priceB: "Bargain prices. Cheap treats bring big crowds.",
    stockFancy: "Fancy treats. High price, high reward.",
    stockMix: "A balanced mix of treats.",
    stockBulk: "Cheap treats in bulk. A crowd favorite.",
  },
  midday: {
    gusQ: "A customer wants two dozen cupcakes boxed up in twenty minutes, right in the middle of the lunch rush. What do you do?",
    gusBest: "Take it, but be honest. Tell them it will be a few minutes so the rush stays smooth.",
    gusB: "Say yes and drop everything to box them all right now.",
    gusC: "Turn it down. You are too slammed to bother.",
    gusLesson: "Good instincts balance the order against the customers already in line. A clear, honest timeline wins both. That is the read to trust.",
    rivalQ: "A bakery on Cary Street just started a buy-one-get-one sale. What is your move?",
    rivalHold: "Hold steady, and add a small thank-you treat for regulars.",
    rivalMatch: "Slash your prices to beat their deal.",
    rivalIgnore: "Ignore it. Their deal is not your problem.",
    compQ: "A customer says the loaf they bought came out burnt. How do you handle it?",
    compFree: "Say sorry and swap it for a fresh loaf, no charge.",
    compDiscount: "Offer a small discount on their next visit.",
    compFirm: "Tell them all sales are final.",
    doneText: "The lunch rush is behind you. Word of how you handled it is already spreading.",
  },
  afternoon: {
    gusQ: "A planner wants a custom cake for a wedding at Maymont this weekend. It is the biggest order the bakery has ever had. What is your call?",
    gusBest: "Say yes, and block out time tomorrow so you can do it right.",
    gusB: "Say yes to every single thing they ask, right now, on top of today.",
    gusC: "Say no. It is too big a risk.",
    gusLesson: "The best opportunities are worth a yes, when you back it with a real plan to deliver. Confidence plus a plan is the instinct that grows a business.",
    leftoverQ: "It is closing time, and you have day-old bread and unsold pastries. What do you do?",
    leftDonate: "Donate the extra bread to a nearby shelter.",
    leftMarkdown: "Mark down the day's bakes so they sell fast.",
    leftToss: "Just pack it all away for tomorrow.",
    orderQ: "A cafe wants to book a standing weekly bread order. How do you price it?",
    orderP: "Premium. A big standing order is worth top dollar.",
    orderF: "A fair price for a big job.",
    orderFriendly: "A friendly rate to keep them coming back.",
    doneText: "That is a wrap. Time to see how your day at the shop went.",
  },
};

// ----------------------------------------------------------------------------
// SHOP 2 — Atlantic Avenue Surf Co. (VB boardwalk) — owner Mr. Reyes
// ----------------------------------------------------------------------------
const SURF: ShopPack = {
  id: "surf",
  shopName: "Atlantic Avenue Surf Co.",
  subtitle: "A Day at Atlantic Avenue Surf Co.",
  premise: "The owner of Atlantic Avenue Surf Co., right on the Virginia Beach boardwalk, is taking the day off and left you in charge. For one day you will set prices, help customers, and make big calls to keep the shop riding high.",
  ownerName: "Mr. Reyes",
  ownerGreeting: "Welcome to Atlantic Avenue Surf Co.! I'm Mr. Reyes. The shop is yours today. Catch me whenever you want to talk a decision through.",
  theme: {
    panelBg: "#e3f1f6", panelBorder: "#1e6f8e", ink: "#163f50",
    accent: "#2a8aa8", accentInk: "#ffffff", boxBg: "#d4e9f1", boxBorder: "#8fc4d6",
  },
  goals: {
    sayHi: "Walk over and say hi to Mr. Reyes.",
    morningCounter: "Now go to your counter to set your prices and stock.",
    middayFind: "The boardwalk rush is picking up. Go find Mr. Reyes.",
    middayFloor: "Now go to your shop floor and take care of the boardwalk rush.",
    afternoonFind: "The afternoon brings a big chance. Go find Mr. Reyes.",
    closeCounter: "Now go to your counter to close out the day.",
  },
  morning: {
    gusQ: "A supplier is offering a big crate of wetsuits at a deep discount, way more than we would rent this whole month. What is your call?",
    gusBest: "Buy a fair amount. Enough to save money, but not so many they sit in the back.",
    gusB: "Grab the whole crate! A discount is a discount.",
    gusC: "Skip it, and just keep what we have.",
    gusLesson: "Good instincts weigh the deal against what you will actually use. A fair amount saves money without tying up cash in gear that just sits. Nice read.",
    priceQ: "How do you price your boards and gear this morning?",
    stockQ: "What do you stock the most of today?",
    readyText: "Your prices are set and your boards are racked. Time to open the doors!",
    priceP: "Premium prices. Charge more for prime boardwalk gear.",
    priceF: "Fair prices. A solid deal for every surfer.",
    priceB: "Bargain prices. Cheap rentals bring big crowds.",
    stockFancy: "High-end boards. High price, high reward.",
    stockMix: "A balanced mix of boards and gear.",
    stockBulk: "Cheap accessories in bulk. A crowd favorite.",
  },
  midday: {
    gusQ: "A camp counselor wants ten boards rented and ready in fifteen minutes, right in the middle of the rush. What do you do?",
    gusBest: "Take it, but be honest. Tell them it will be a few minutes so the rush stays smooth.",
    gusB: "Say yes and drop everything to rig all ten right now.",
    gusC: "Turn it down. You are too slammed to bother.",
    gusLesson: "Good instincts balance the big group against the customers already in line. A clear, honest timeline wins both. That is the read to trust.",
    rivalQ: "A shop further down the boardwalk just slashed its rental prices. What is your move?",
    rivalHold: "Hold steady, and toss in a free wax for regulars.",
    rivalMatch: "Slash your prices to beat their deal.",
    rivalIgnore: "Ignore it. Their deal is not your problem.",
    compQ: "A customer says the board they rented has a ding and took on water. How do you handle it?",
    compFree: "Say sorry and swap it for a fresh board, no charge.",
    compDiscount: "Offer a small discount on their next rental.",
    compFirm: "Tell them all rentals are final.",
    doneText: "The boardwalk rush is behind you. Word of how you handled it is already spreading.",
  },
  afternoon: {
    gusQ: "The East Coast Surfing Championships need a gear vendor for the weekend. It is the biggest order we have ever had. What is your call?",
    gusBest: "Say yes, and block out time tomorrow so you can do it right.",
    gusB: "Say yes to every single thing they ask, right now, on top of today.",
    gusC: "Say no. It is too big a risk.",
    gusLesson: "The best opportunities are worth a yes, when you back it with a real plan to deliver. Confidence plus a plan is the instinct that grows a business.",
    leftoverQ: "It is closing time, and you have rental boards back and unsold sunscreen. What do you do?",
    leftDonate: "Hand the extra sunscreen to the lifeguard stand.",
    leftMarkdown: "Mark down the day's gear so it sells fast.",
    leftToss: "Just pack it all away for tomorrow.",
    orderQ: "A summer camp wants to book a big group rental for next week. How do you price it?",
    orderP: "Premium. A big standing order is worth top dollar.",
    orderF: "A fair price for a big booking.",
    orderFriendly: "A friendly rate to keep them coming back.",
    doneText: "That is a wrap. Time to see how your day at the shop went.",
  },
};

// ----------------------------------------------------------------------------
// SHOP 3 — Clarendon Device Repair (Arlington) — owner Ms. Okafor
// ----------------------------------------------------------------------------
const REPAIR: ShopPack = {
  id: "repair",
  shopName: "Clarendon Device Repair",
  subtitle: "A Day at Clarendon Device Repair",
  premise: "The owner of Clarendon Device Repair, in the heart of Arlington, is taking the day off and left you in charge. For one day you will set prices, help customers, and make big calls to keep the shop running.",
  ownerName: "Ms. Okafor",
  ownerGreeting: "Welcome to Clarendon Device Repair! I'm Ms. Okafor. The shop is yours today. Find me whenever you want to talk a decision through.",
  theme: {
    panelBg: "#e9edf1", panelBorder: "#445a72", ink: "#29384a",
    accent: "#46708c", accentInk: "#ffffff", boxBg: "#dce3ea", boxBorder: "#b3c2d0",
  },
  goals: {
    sayHi: "Walk over and say hi to Ms. Okafor.",
    morningCounter: "Now go to your counter to set your prices and focus.",
    middayFind: "The midday rush is picking up. Go find Ms. Okafor.",
    middayFloor: "Now go to your shop floor and take care of the midday rush.",
    afternoonFind: "The afternoon brings a big chance. Go find Ms. Okafor.",
    closeCounter: "Now go to your counter to close out the day.",
  },
  morning: {
    gusQ: "A parts supplier is offering a big lot of phone screens at a discount, far more than today's repairs need. What is your call?",
    gusBest: "Buy a fair amount. Enough to save money, but not a pile that sits on the shelf.",
    gusB: "Grab the whole lot! A discount is a discount.",
    gusC: "Skip it, and just order what today needs.",
    gusLesson: "Good instincts weigh the deal against what you will actually use. A fair amount saves money without tying up cash in parts that just sit. Nice read.",
    priceQ: "How do you price your repairs this morning?",
    stockQ: "What do you focus on today?",
    readyText: "Your prices are set and your bench is ready. Time to open the doors!",
    priceP: "Premium prices. Charge more for expert work.",
    priceF: "Fair prices. A solid deal for every customer.",
    priceB: "Bargain prices. Cheap fixes bring big crowds.",
    stockFancy: "Big laptop jobs. High price, high reward.",
    stockMix: "A balanced mix of repairs.",
    stockBulk: "Quick, cheap fixes in bulk. A crowd favorite.",
  },
  midday: {
    gusQ: "A customer needs a cracked phone fixed in under an hour before a flight, right in the middle of the rush. What do you do?",
    gusBest: "Take it, but be honest. Tell them the real time it needs so the rush stays smooth.",
    gusB: "Say yes and drop every other repair to rush it now.",
    gusC: "Turn it down. You are too backed up to bother.",
    gusLesson: "Good instincts balance the rush job against the customers already waiting. A clear, honest timeline wins both. That is the read to trust.",
    rivalQ: "A mall kiosk nearby just dropped its repair prices. What is your move?",
    rivalHold: "Hold steady, and back your repairs with a free warranty.",
    rivalMatch: "Slash your prices to beat their deal.",
    rivalIgnore: "Ignore it. Their deal is not your problem.",
    compQ: "A customer says the screen you fixed yesterday is already flickering. How do you handle it?",
    compFree: "Say sorry and fix it again for free, right away.",
    compDiscount: "Offer a small discount on their next repair.",
    compFirm: "Tell them all repairs are final.",
    doneText: "The midday rush is behind you. Word of how you handled it is already spreading.",
  },
  afternoon: {
    gusQ: "A local school needs a whole cart of tablets repaired before Monday. It is the biggest order we have ever had. What is your call?",
    gusBest: "Say yes, and block out time tomorrow so you can do it right.",
    gusB: "Say yes to every single thing they ask, right now, on top of today.",
    gusC: "Say no. It is too big a risk.",
    gusLesson: "The best opportunities are worth a yes, when you back it with a real plan to deliver. Confidence plus a plan is the instinct that grows a business.",
    leftoverQ: "It is closing time, and you have spare parts and a few fixed-up devices. What do you do?",
    leftDonate: "Donate a refurbished tablet to the local library.",
    leftMarkdown: "Sell the refurbished devices at a markdown.",
    leftToss: "Just shelve them for tomorrow.",
    orderQ: "A company wants to book a big batch of repairs for next week. How do you price it?",
    orderP: "Premium. A big standing order is worth top dollar.",
    orderF: "A fair price for a big batch.",
    orderFriendly: "A friendly rate to keep them coming back.",
    doneText: "That is a wrap. Time to see how your day at the shop went.",
  },
};

// ----------------------------------------------------------------------------
// The pack registry, plus the "active shop" the picker will set in Stage 2.
// It defaults to the bakery so everything keeps working before the picker exists.
// ----------------------------------------------------------------------------
export const SHOPS: Record<ShopId, ShopPack> = {
  bakery: BAKERY,
  surf: SURF,
  repair: REPAIR,
};

export let activeShop: ShopPack = SHOPS.bakery;

export function setActiveShop(id: ShopId): void {
  activeShop = SHOPS[id];
}
