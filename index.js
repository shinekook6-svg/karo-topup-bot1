import { Bot, InlineKeyboard } from "grammy";
// =======================================//
// ၁။ BOT CONFIGURATION & LOGICS
// ========================================//
function createBot(env) {
  // Cloudflare Variable ထဲက Token ကို တန်းယူမယ်
  const bot = new Bot(env.BOT_TOKEN);
  const ADMIN_ID = 6870403909;

  // DB ကို Middleware နဲ့ context ထဲ ထည့်ပေးလိုက်တာ
  bot.use(async (ctx, next) => {
    ctx.env = env;
    await next();
  });
//=====================================//
//-----(A) HELPER FUNCTIONS ---------//
//====================================//
//----smartEdit function-----
const smartEdit = async (ctx, text, extra = {}) => {
  try {
    return await ctx.editMessageText(text, { parse_mode: "HTML", ...extra });
  } catch (err) {
    
    if (err.description?.includes("message is not modified")) return;

    return await ctx.reply(text, { parse_mode: "HTML", ...extra });
  }
};

//-----Main Menu Function----//
const getMainMenu = (userId) => {
  const keyboard = new InlineKeyboard()
    .text("🛒 TopUp မည်", "usr_topup")
    .text("💵 ငွေဖြည့်မည်", "usr_deposit").row()
    .text("💰 Wallet", "wallet")
    .text("📜 TopUp History", "topup_hist").row()
    .text("📥 Deposit History", "deposit_hist");

  if (userId === ADMIN_ID) {
    keyboard.row().text("🛠 Admin Panel", "adm_main");
  }
  return keyboard;
};
//===================================//
//---(B) Command ဝင်လာရင် State ရှင်းမယ့် Middleware
//==================================//
bot.on("message:text", async (ctx, next) => {
  if (ctx.message.text.startsWith("/")) {
    await ctx.env.DB.prepare("UPDATE users SET current_state = NULL, temp_data = NULL WHERE user_id = ?")
      .bind(ctx.from.id).run();
  }
  await next();
});
//====================================//
  // --- (C) BOT COMMANDS ---------
//=====================================//
  bot.command("start", async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.username ? `@${ctx.from.username}` : "UserName မရှိပါ";
    const fullName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" ") || "User";

    try {
      await ctx.env.DB.prepare(`
        INSERT OR IGNORE INTO users (user_id, username, full_name, balance) 
        VALUES (?, ?, ?, 0)
      `).bind(userId, username, fullName).run();
    } catch (err) { console.error("DB Error: " + err.message); }

    await ctx.reply(`👋 မင်္ဂလာပါ ${fullName}!\nKaro TopUp Bot မှ ကြိုဆိုပါတယ်!`, {
      reply_markup: getMainMenu(userId),
    });
  });
//---contact - Admin ဆီ တိုက်ရိုက်သွားမယ့် ခလုတ်
bot.command("contact", async (ctx) => {
  const keyboard = new InlineKeyboard()
    .url("👨‍💻 Chat with Admin", "https://t.me/Karo_vanRossum")
    .row()
    .text("🏠 Back to Home", "back_home");

  await ctx.reply("📞 <b>တိုက်ရိုက်ဆက်သွယ်ရန်</b>\n\nတစ်ခုခု အဆင်မပြေဖြစ်ပါက Admin ကို တိုက်ရိုက် ဆက်သွယ်နိုင်ပါတယ် ခဗျာ။", {
    parse_mode: "HTML",
    reply_markup: keyboard
  });
});
// /botnews - Channel ကို Link နဲ့ သွားမယ်
bot.command("botnews", async (ctx) => {
  const keyboard = new InlineKeyboard()
    .url("📢 Join Channel", "https://t.me/Karo_BotDeveloper")
    .row()
    .text("🏠 Back to Home", "back_home");

  await ctx.reply("📢 <b>Bot Update သတင်းများ</b>\n\nဈေးနှုန်းများနှင့် အထူးပရိုမိုးရှင်းများကို Channel တွင် ကြည့်ရှုနိုင်ပါသည်။", {
    parse_mode: "HTML",
    reply_markup: keyboard
  });
});
// /feedback - Reviews တွေကြည့်ဖို့
bot.command("feedback", async (ctx) => {
  const keyboard = new InlineKeyboard()
    .url("📝 Go to Real Reviews", "https://t.me/ReviewByKaro")
    .row()
    .text("🏠 Back to Home", "back_home");

  await ctx.reply("✅ <b>Reviews Channel</b>\n\nBot Service များနှင့် Game TopUp များကို Reviews(သက်သေ) ဝင်ကြည့်နိုင်ပါသည်။", {
    parse_mode: "HTML",
    reply_markup: keyboard
  });
});
// /help - Help Bot ကို ခလုတ်နဲ့ သွားမယ်
bot.command("help", async (ctx) => {
  const keyboard = new InlineKeyboard()
    .url("🤖 Go to Help Bot", "https://t.me/HelpFactory_bot") // မင်းရဲ့ Help Bot username ထည့်
    .row()
    .text("🏠 Back to Home", "back_home");

  await ctx.reply("💡 <b>Help Center</b>\n\nBot အသုံးပြုနည်းနှင့် အခြားသိလိုသည်များကို ကျွန်ုပ်တို့၏ Help Bot တွင် အသေးစိတ် မေးမြန်းနိုင်ပါသည်။", {
    parse_mode: "HTML",
    reply_markup: keyboard
  });
});
//-----Proof ကြည့်ရန်----//
bot.command("proof", async (ctx) => {
  const keyboard = new InlineKeyboard()
    .url("✅ Go to Proof Channel", "https://t.me/KaroSellProof")
    .row()
    .text("🏠 Back to Home", "back_home");

  await ctx.reply("✅ <b>Proof Channel</b>\n\nBot Service များနှင့် Game TopUp များကို Proof(သက်သေ) ဝင်ကြည့်နိုင်ပါသည်။", {
    parse_mode: "HTML",
    reply_markup: keyboard
  });
});
//======================================//
  // ---(D) CALLBACK QUERIES --------
//=====================================//
//---State တွေကိုစောင့်ပြီး စစ်မယ် Middleware
bot.on("callback_query:data", async (ctx, next) => {
  await ctx.env.DB.prepare("UPDATE users SET current_state = NULL, temp_data = NULL WHERE user_id = ?")
    .bind(ctx.from.id).run();
  await next();
});
//---Admin Pannel ထဲက Main Menus-----//
bot.callbackQuery("adm_main", async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return ctx.answerCallbackQuery("Admin ပဲ သုံးလို့ရမယ် သားကြီး!");

  const adminKeyboard = new InlineKeyboard()
    .text("🎮 Games Manage", "adm_game")
    .text("💳 Payment Manage", "adm_payment").row()
    .text("📥 Deposit Orders", "adm_depo_ord")
    .text("📦 TopUp Orders", "adm_topup_ord").row()
    .text("📢 Noti for Done", "adm_setup_noti")
    .text("🤖 Bot Users List", "adm_usr_list").row()
    .text("⬅️ Back to Home", "back_home");
    
  await ctx.editMessageText("🛠 **Admin Control Panel**\n\nလုပ်ဆောင်လိုသည့် အပိုင်းကို ရွေးချယ်ပါ Admin ကြီး။", {
    reply_markup: adminKeyboard,
    parse_mode: "Markdown",
  });
});
//----Back Home Logic----
  bot.callbackQuery("back_home", async (ctx) => {
    await smartEdit(ctx, "🏠 ပင်မမီနူးသို့ ပြန်ရောက်ပါပြီ။", {
      reply_markup: getMainMenu(ctx.from.id)
    });
  });
//-----ပုံကိုဖျက်ပစ်မယ် သို့မဟုတ် ခလုတ်တွေကိုဘဲဖျက်မယ်
bot.callbackQuery("close_view", async (ctx) => {
  try {
    // ပုံကြီးကို ဖျက်မယ်
    await ctx.deleteMessage();
    // Notification လေးမှာ "မြင်ကွင်းကို ပိတ်လိုက်ပါပြီ" လို့ ပြပေးမယ်
    await ctx.answerCallbackQuery("View Closed"); 
  } catch (e) {
    // တစ်ခုခုကြောင့် ဖျက်မရရင် ခလုတ်တွေကိုပဲ ဖျောက်လိုက်မယ်
    await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    await ctx.answerCallbackQuery("Action Cleared");
  }
});
//==================================//
//------(E) Admin Only Logics
//=================================//
// ၁။ Admin Panel ထဲက ဂိမ်းစီမံခန့်ခွဲမှု
bot.callbackQuery("adm_game", async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;

  const games = await ctx.env.DB.prepare("SELECT * FROM games").all();
  const keyboard = new InlineKeyboard();

  games.results.forEach(game => {
    keyboard.text(`🎮 ${game.game_name}`, `adm_manage_game_${game.id}`).row();
  });

  keyboard.text("🛠 MLBB", "game_ml").row()
  .text("🛠 PUBG", "game_pubg").row()
  .text("🛠 HOK", "game_hok").row()
  .text("⬅️ Back", "adm_main");

  await smartEdit(ctx, "🎮 <b>Game Management</b>\n\nပြုပြင်လိုသည့် ဂိမ်းကို ရွေးပါ Admin။", { reply_markup: keyboard });
});
// --- ၁။ ဂိမ်းတစ်ခုချင်းစီရဲ့ Setting Menu ---
bot.callbackQuery(/^adm_manage_game_(.+)$/, async (ctx) => {
  const gameId = ctx.match[1]; // ဒါက split လုပ်စရာမလိုဘဲ ID ကို တန်းယူတာ
  
  const game = await ctx.env.DB.prepare("SELECT * FROM games WHERE id = ?").bind(gameId).first();
  if (!game) return ctx.answerCallbackQuery("ဂိမ်းမတွေ့ပါ!");

  const keyboard = new InlineKeyboard()
    .text("➕ Add Item", `adm_add_item_${gameId}`)
    .text("✏️ Edit Prices", `adm_edit_price_${gameId}`).row()
    .text("🗑 Delete Item", `adm_del_item_${gameId}`)
    .text("⬅️ Back to Games", "adm_game");

  await smartEdit(ctx, `🎮 <b>Game Setting: ${game.game_name}</b>\n\nပြုလုပ်လိုသည့် လုပ်ဆောင်ချက်ကို ရွေးချယ်ပါ Admin။`, {
    reply_markup: keyboard
  });
});
// --- ၂။ Item အသစ်ထည့်ရန် စာတောင်းခြင်း ---
bot.callbackQuery(/^adm_add_item_(.+)$/, async (ctx) => {
  const gameId = ctx.match[1];
  // State မှတ်မယ်၊ temp_data ထဲမှာ gameId ကို သိမ်းထားမယ်
  await ctx.env.DB.prepare("UPDATE users SET current_state = 'WAIT_ADD_ITEM', temp_data = ? WHERE user_id = ?")
    .bind(gameId, ctx.from.id).run();

  await smartEdit(ctx, `💎 <b>Item အသစ်ထည့်သွင်းခြင်း</b>\n\nအောက်ပါပုံစံအတိုင်း ရိုက်ပို့ပေးပါ -\n\n<code>Item အမည် = ဈေးနှုန်း</code>\nဥပမာ ၁ - <code>86 Diamonds = 2500</code>
  \nဥပမာ ၂ - <code> Uc 60 = 4000 </code>`, {
    reply_markup: new InlineKeyboard().text("❌ မထည့်တော့ပါ", `adm_manage_game_${gameId}`)
  });
});
//Edit Price or Delete Items
bot.callbackQuery([/^adm_edit_price_(.+)$/, /^adm_del_item_(.+)$/], async (ctx) => {
  const action = ctx.callbackQuery.data.startsWith("adm_edit_price") ? "EDIT" : "DEL";
  const gameId = ctx.match[1];
  
  // အဲ့ဒီ Game အောက်မှာရှိတဲ့ Item တွေကို DB က ဆွဲထုတ်မယ်
  const items = await ctx.env.DB.prepare("SELECT * FROM game_items WHERE game_id = ?").bind(gameId).all();
  const keyboard = new InlineKeyboard();

  if (items.results.length === 0) {
    return ctx.answerCallbackQuery("❌ Item စာရင်း မရှိသေးပါ!");
  }

  items.results.forEach(item => {
    // Edit ဆိုရင် edit logic ဆီလွှတ်၊ Del ဆိုရင် del logic ဆီလွှတ်
    const callbackData = action === "EDIT" ? `step_edit_${item.id}` : `confirm_del_${item.id}`;
    keyboard.text(`💎 ${item.item_name} (${item.price} MMK)`, callbackData).row();
  });

  keyboard.text("⬅️ Back", `adm_manage_game_${gameId}`);

  const msg = action === "EDIT" ? "✏️ ဈေးနှုန်းပြင်လိုသည့် Item ကို ရွေးပါ Admin" : "🗑 ဖျက်လိုသည့် Item ကို ရွေးပါ Admin";
  await smartEdit(ctx, msg, { reply_markup: keyboard });
});
//Item ကိုတကယ်အတည်ဖျက်ပြီ
bot.callbackQuery(/^confirm_del_(.+)$/, async (ctx) => {
  const itemId = ctx.match[1];
  
  // အရင်ဆုံး ဘယ်ဂိမ်းကလဲဆိုတာ သိအောင် Item ကို အရင်ရှာ (ပြီးရင် ပြန်သွားဖို့)
  const item = await ctx.env.DB.prepare("SELECT game_id, item_name FROM game_items WHERE id = ?").bind(itemId).first();
  
  if (!item) return ctx.answerCallbackQuery("Item မရှိတော့ပါ!");

  // DB ကနေ ဖျက်ပြီ!
  await ctx.env.DB.prepare("DELETE FROM game_items WHERE id = ?").bind(itemId).run();

  await ctx.answerCallbackQuery(`${item.item_name} ကို ဖျက်လိုက်ပါပြီ!`);
  
  // Game Setting menu ကို ပြန်လွှတ်မယ်
  const keyboard = new InlineKeyboard().text("⬅️ Back to Menu", `adm_manage_game_${item.game_id}`);
  await smartEdit(ctx, `✅ <b>${item.item_name}</b> ကို အောင်မြင်စွာ ဖျက်လိုက်ပါပြီ။`, { reply_markup: keyboard });
});
//Items Price ပြင်မယ် State စမှတ်မယ်
bot.callbackQuery(/^step_edit_(.+)$/, async (ctx) => {
  const itemId = ctx.match[1];
  // ဘယ် Item ကို ပြင်မှာလဲဆိုတာ သိအောင် အရင်ရှာမယ်
  const item = await ctx.env.DB.prepare("SELECT * FROM game_items WHERE id = ?").bind(itemId).first();
  
  if (!item) return ctx.answerCallbackQuery("Item မရှိတော့ပါ!");
  // User ရဲ့ state ကို 'WAIT_EDIT_PRICE' ပြောင်းပြီး temp_data ထဲမှာ itemId ကို မှတ်ထားမယ်
  await ctx.env.DB.prepare("UPDATE users SET current_state = 'WAIT_EDIT_PRICE', temp_data = ? WHERE user_id = ?")
    .bind(itemId, ctx.from.id).run();

  await smartEdit(ctx, `✏️ <b>${item.item_name}</b> အတွက် ဈေးနှုန်းအသစ် ပို့ပေးပါ။\n\nလက်ရှိဈေး: <b>${item.price} MMK</b>\n\nဂဏန်းသီးသန့် (ဥပမာ - 3000) ရိုက်ပို့ပေးပါ။`, {
    reply_markup: new InlineKeyboard().text("❌ မပြင်တော့ပါ", `adm_manage_game_${item.game_id}`)
  });
});
//----TopUp Orders Logic-----//
bot.callbackQuery("adm_topup_ord", async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;

  const orders = await ctx.env.DB.prepare(`
    SELECT o.*, u.full_name 
    FROM topup_orders o 
    JOIN users u ON o.user_id = u.user_id 
    WHERE o.status = 'pending' 
    ORDER BY o.id DESC LIMIT 10
  `).all();

  let msg = "📦 <b>လက်ရှိစောင့်ဆိုင်းနေသော TopUp အော်ဒါများ</b>\n\n";
  const keyboard = new InlineKeyboard();

  if (orders.results.length === 0) {
    msg += "<i>လက်ရှိတွင် Order မရှိပါ။</i>";
  } else {
    orders.results.forEach(order => {
      msg += `🔹 #${order.id} | ${order.full_name} | ${order.item_details}\n`;
      keyboard.text(`🔍 View #${order.id}`, `view_topup_${order.id}`).row();
    });
  }

  keyboard.text("⬅️ Back", "adm_main");
  await smartEdit(ctx, msg, { reply_markup: keyboard });
});

//---TopUp order ရဲ့ View logics----//
bot.callbackQuery(/^view_topup_(.+)$/, async (ctx) => {
  const orderId = ctx.match[1];
  const order = await ctx.env.DB.prepare(`
    SELECT o.*, u.full_name, u.balance 
    FROM topup_orders o 
    JOIN users u ON o.user_id = u.user_id 
    WHERE o.id = ?
  `).bind(orderId).first();

  if (!order) return ctx.answerCallbackQuery("Order မတွေ့တော့ပါ!");

  const detailMsg = `🧾 <b>TopUp Order Detail (#${order.id})</b>\n\n` +
                    `👤 User: ${order.full_name} (ID: <code>${order.user_id}</code>)\n` +
                    `💎 Item: <b>${order.item_details}</b>\n` +
                    `🆔 Player ID: <code>${order.player_id}</code>\n` +
                    `⏰ Time: ${order.created_at}\n\n` +
                    `Admin ကြီး... လုပ်ဆောင်ချက် ရွေးချယ်ပါ။`;

  const keyboard = new InlineKeyboard()
    .text("✅ Done (ဖြည့်ပြီးပြီ)", `done_topup_${order.id}`)
    .text("💰 Refund (ပြန်အမ်း)", `ref_topup_${order.id}`).row()
    .text("🗑 Close View", "adm_topup_ord");

  await smartEdit(ctx, detailMsg, { reply_markup: keyboard });
});
//-----TopUp order ကို Done မယ်-----//
bot.callbackQuery(/^done_topup_(.+)$/, async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  const orderId = ctx.match[1];

  const order = await ctx.env.DB.prepare(`
    SELECT o.*, u.full_name FROM topup_orders o 
    JOIN users u ON o.user_id = u.user_id 
    WHERE o.id = ?
  `).bind(orderId).first();

  if (!order) return ctx.answerCallbackQuery("Order မတွေ့တော့ပါ!");

  // ၁။ DB မှာ Done ပြောင်းမယ်
  await ctx.env.DB.prepare("UPDATE topup_orders SET status = 'done' WHERE id = ?").bind(orderId).run();

  // ၂။ [User ဆီပို့မယ့် Private Noti] - ပိုပြီး ရင်းနှီးဖော်ရွေတဲ့ပုံစံ
  const userMsg = `🎉 <b>TopUp အောင်မြင်ပါပြီ ခဗျာ!</b>\n\n` +
                  `📦 Item: <b>${order.item_details}</b>\n` +
                  `🆔 Player ID: <code>${order.player_id}</code>\n\n` +
                  `လူကြီးမင်း၏ Order ကို အောင်မြင်စွာ ဖြည့်သွင်းပေးပြီးပါပြီ။ နောက်လည်း အားပေးပါဦးနော်။ ✨`;
  
  try {
    await ctx.api.sendMessage(order.user_id, userMsg, { parse_mode: "HTML" });
  } catch (e) { console.log("User Noti Error"); }

  // ၃။ [Channel/Group ဆီပို့မယ့် Public Noti] - ကြည့်ရတာ ပိုရှင်းပြီး Professional ကျတဲ့ပုံစံ
  const activeChats = await ctx.env.DB.prepare("SELECT chat_username FROM chat_notis WHERE chat_status = 'ON'").all();
  
  const publicMsg = `✅ <b>TopUp Completed! (Success)</b>\n\n` +
                    `📝 Order ID: #${order.id}\n` +
                    `👤 Customer: ${order.full_name}\n` +
                    `💎 Item: <b>${order.item_details}</b>\n` +
                    `🆔 Player ID: <code>${order.player_id.substring(0, 4)}****</code>\n` + // ID ကို အကုန်မပြဘဲ ဖုံးထားပေးတာမျိုး
                    `⏰ Time: ${new Date().toLocaleString()}\n\n` +
                    `🛒 ဤ Bot တွင် စိတ်ချစွာ ဝယ်ယူနိုင်ပါပြီ။`;

  for (const chat of activeChats.results) {
    try {
      await ctx.api.sendMessage(chat.chat_username, publicMsg, { parse_mode: "HTML" });
    } catch (e) {
      console.log(`Failed to send to ${chat.chat_username}`);
    }
  }

  await ctx.answerCallbackQuery("Done & Broadcasted!");
  await smartEdit(ctx, `✅ Order #${orderId} ကို အောင်မြင်စွာ လုပ်ဆောင်ပြီးပါပြီ။`, {
    reply_markup: new InlineKeyboard().text("⬅️ Back to List", "adm_topup_ord")
  });
});
// --- (B) Refund Logic ---
bot.callbackQuery(/^ref_topup_(.+)$/, async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  const orderId = ctx.match[1];

  // Order ထဲမှာပါတဲ့ item_id ကို သုံးပြီး game_items table နဲ့ ချိတ်ဆက်ယူမယ်
  const order = await ctx.env.DB.prepare(`
    SELECT o.*, i.price 
    FROM topup_orders o 
    JOIN game_items i ON o.item_id = i.id 
    WHERE o.id = ?
  `).bind(orderId).first();

  if (!order) return ctx.answerCallbackQuery("Error: Order သို့မဟုတ် Item ကို ရှာမတွေ့ပါ!");

  // ၁။ ပိုက်ဆံပြန်အမ်း
  await ctx.env.DB.prepare("UPDATE users SET balance = balance + ? WHERE user_id = ?")
    .bind(order.price, order.user_id).run();

  // ၂။ Status ကို Refunded ပြောင်း
  await ctx.env.DB.prepare("UPDATE topup_orders SET status = 'refunded' WHERE id = ?").bind(orderId).run();

  // ၃။ User ဆီ Noti ပို့
  await ctx.api.sendMessage(order.user_id, 
    `❌ <b>Order Refunded!</b>\n\n${order.item_details} အတွက် Stock ပြတ်လပ်နေသဖြင့် <b>${order.price} MMK</b> ကို သင့် Wallet ထဲ ပြန်ထည့်ပေးလိုက်ပါပြီ။`,
    { parse_mode: "HTML" }
  );

  await ctx.answerCallbackQuery("Refunded by Item ID!");
  await smartEdit(ctx, `💰 Order #${orderId} ကို Item ID အသုံးပြု၍ Refund(ငွေပြန်အမ်း) လုပ်ပြီးပါပြီ။`, {
    reply_markup: new InlineKeyboard().text("⬅️ Back to List", "adm_topup_ord")
  });
});
// --- ၁။ Payment Manage Main Menu ---
bot.callbackQuery("adm_payment", async (ctx) => {
  const keyboard = new InlineKeyboard()
    .text("✏️ KBZ Pay ပြင်မည်", "set_kpay")
    .text("✏️ Wave Pay ပြင်မည်", "set_wave").row()
    .text("⬅️ Back", "adm_main");

  await smartEdit(ctx, "💳 ပြင်ဆင်လိုသည့် Payment ကို ရွေးချယ်ပါ Admin။", { reply_markup: keyboard });
});

// --- ၂။ တစ်ခုခုကို နှိပ်လိုက်ရင် (စာတောင်းမယ်)
bot.callbackQuery(["set_kpay", "set_wave"], async (ctx) => {
  const type = ctx.callbackQuery.data === "set_kpay" ? "KPay" : "WavePay";
  
  // State မှတ်မယ်
  await ctx.env.DB.prepare("UPDATE users SET current_state = ? WHERE user_id = ?")
    .bind(`WAIT_PAY_${type}`, ctx.from.id).run();

  await smartEdit(ctx, `📝 <b>${type}</b> အတွက် အချက်အလက်ပို့ပေးပါ။\n\nပုံစံ - <code>နံပါတ် = အမည်</code>\nဥပမာ - <code>091234567 = U Kyaw</code>`, {
    reply_markup: new InlineKeyboard().text("❌ မပြင်ချင်တော့ပါ", "adm_payment")
  });
});
// --- ၃။ အတည်ပြုလိုက်ရင် D1 ထဲ သိမ်းပြီ ---
bot.callbackQuery(/^confirm_pay_(.+)$/, async (ctx) => {
  const type = ctx.match[1];//K or W
  const user = await ctx.env.DB.prepare("SELECT temp_data FROM users WHERE user_id = ?")
    .bind(ctx.from.id).first();

  if (!user?.temp_data) return ctx.answerCallbackQuery("Error: Data not found!");

  const [number, name] = user.temp_data.split("=").map(i => i.trim());

  try {
    await ctx.env.DB.prepare(`
      INSERT INTO payments (id, method_name, account_name, account_number)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
      account_name = excluded.account_name,
      account_number = excluded.account_number
    `).bind(type.toLowerCase(), type, name, number).run();

    // အောင်မြင်ရင် state တွေ ပြန်ဖျက်
    await ctx.env.DB.prepare("UPDATE users SET current_state = NULL, temp_data = NULL WHERE user_id = ?")
      .bind(ctx.from.id).run();

    await smartEdit(ctx, `✅ ${type} ကို အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ။`, {
      reply_markup: new InlineKeyboard().text("⬅️ Back", "adm_payment")
    });
  } catch (err) {
    await ctx.reply("❌ DB Error: " + err.message);
  }
});
//-----Admin Delodit Orders Logics----
bot.callbackQuery("adm_depo_ord", async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;

  // နောက်ဆုံးတင်ထားတဲ့ pending order ၁၀ ခုကို ဆွဲထုတ်မယ်
  const orders = await ctx.env.DB.prepare(`
    SELECT d.*, u.full_name 
    FROM deposits d 
    JOIN users u ON d.user_id = u.user_id 
    WHERE d.status = 'pending' 
    ORDER BY d.id DESC LIMIT 10
  `).all();

  let msg = "📥 <b>လက်ရှိစောင့်ဆိုင်းနေသော ငွေဖြည့်လွှာများ</b>\n\n";
  const keyboard = new InlineKeyboard();

  if (orders.results.length === 0) {
    msg += "<i>လက်ရှိတွင် စောင့်ဆိုင်းနေသော order မရှိပါ။</i>";
  } else {
    orders.results.forEach(order => {
      msg += `🔹 #${order.id} | ${order.full_name} | <b>${order.amount} MMK</b>\n`;
      // တစ်ခုချင်းစီကို အသေးစိတ်ကြည့်ဖို့ ခလုတ်စီမယ်
      keyboard.text(`View #${order.id}`, `view_depo_${order.id}`).row();
    });
  }

  keyboard.text("⬅️ Back", "adm_main");

  await smartEdit(ctx, msg, { reply_markup: keyboard });
});
// --- Order တစ်ခုချင်းစီကို View လုပ်ခြင်း ---
bot.callbackQuery(/^view_depo_(.+)$/, async (ctx) => {
  const depoId = ctx.match[1];
  const order = await ctx.env.DB.prepare(`
    SELECT d.*, u.full_name 
    FROM deposits d 
    JOIN users u ON d.user_id = u.user_id 
    WHERE d.id = ?
  `).bind(depoId).first();

  if (!order) return ctx.answerCallbackQuery("Order မတွေ့တော့ပါ။");

  const detailMsg = `🧾 <b>Order Detail (#${order.id})</b>\n\n` +
                    `👤 User: ${order.full_name} (ID: <code>${order.user_id}</code>)\n` +
                    `💰 Amount: <b>${order.amount} MMK</b>\n` +
                    `⏰ Time: ${order.created_at}\n\n` +
                    `စစ်ဆေးပြီးပါက အတည်ပြုခြင်း သို့မဟုတ် ငြင်းပယ်ခြင်း ပြုလုပ်ပါ။`;

  const keyboard = new InlineKeyboard()
    .text("✅ Approve", `approve_depo_${order.id}`)
    .text("❌ Reject", `reject_depo_${order.id}`).row()
    .text("🗑 Close This View", "close_view");
  await ctx.replyWithPhoto(order.screenshot_id, {
    caption: detailMsg,
    parse_mode: "HTML",
    reply_markup: keyboard
  });
  
  await ctx.answerCallbackQuery();
});

// --- ၁။ ငွေဖြည့်လွှာကို အတည်ပြုခြင်း (Approve)
bot.callbackQuery(/^approve_depo_(.+)$/, async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  const depoId = ctx.match[1];

  try {
    // အရင်ဆုံး deposit အချက်အလက်ကို ယူမယ်
    const order = await ctx.env.DB.prepare("SELECT * FROM deposits WHERE id = ? AND status = 'pending'")
      .bind(depoId).first();

    if (!order) return ctx.answerCallbackQuery("⚠️ ဒီ Order က အတည်ပြုပြီးသား သို့မဟုတ် မရှိတော့ပါ!");

    // (A) User Balance ကို တိုးမယ်
    await ctx.env.DB.prepare("UPDATE users SET balance = balance + ? WHERE user_id = ?")
      .bind(order.amount, order.user_id).run();

    // (B) Deposit Status ကို 'approved' ပြောင်းမယ်
    await ctx.env.DB.prepare("UPDATE deposits SET status = 'approved' WHERE id = ?")
      .bind(depoId).run();

    // Admin ကို အကြောင်းပြန်မယ်
    await ctx.editMessageCaption({
      caption: `✅ <b>Order #${depoId} ကို အတည်ပြုပြီးပါပြီ!</b>\n\nUser ID: ${order.user_id}\nAmount: ${order.amount} MMK ဖြည့်သွင်းပြီး။`,
      parse_mode: "HTML",
      reply_markup: undefined
    });
        // User ဆီ Noti လှမ်းပို့မယ် (ခလုတ်တွေပါ ထည့်ပေးလိုက်မယ်)
    const userKeyboard = new InlineKeyboard()
      .text("💰 Wallet စစ်မည်", "wallet")
      .text("🏠 ပင်မမီနူးသို့", "back_home");

    await ctx.api.sendMessage(
      order.user_id, 
      `🎉 <b>ငွေဖြည့်မှု အောင်မြင်ပါသည်။</b>\n\nသင်၏ Wallet ထဲသို့ <b>${order.amount} MMK</b> ထည့်သွင်းပြီးပါပြီ။\n\nလက်ရှိ လက်ကျန်ငွေဖြင့် ဂိမ်းများကို စတင်ဝယ်ယူနိုင်ပါပြီ။`, 
      {
        parse_mode: "HTML",
        reply_markup: userKeyboard
      }
    );

    await ctx.answerCallbackQuery("Done!");
  } catch (err) {
    await ctx.reply("❌ Approve Error: " + err.message);
  }
});
// --- ၂။ ငွေဖြည့်လွှာကို ငြင်းပယ်
bot.callbackQuery(/^reject_depo_(.+)$/, async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  const depoId = ctx.match[1];

  try {
    const order = await ctx.env.DB.prepare("SELECT * FROM deposits WHERE id = ? AND status = 'pending'")
      .bind(depoId).first();

    if (!order) return ctx.answerCallbackQuery("⚠️ မရှိတော့သော Order ဖြစ်သည်။");
    // Status ကို 'rejected' ပြောင်းမယ်
    await ctx.env.DB.prepare("UPDATE deposits SET status = 'rejected' WHERE id = ?")
      .bind(depoId).run();

        await ctx.editMessageCaption({
      caption: `❌ <b>Order #${depoId} ကို ငြင်းပယ်လိုက်ပါသည်။</b>`,
      parse_mode: "HTML",
      reply_markup: undefined // ခလုတ်တွေ ပျောက်သွားအောင်
    });
    // User ဆီ Noti ပို့မယ်
    await ctx.api.sendMessage(order.user_id, `❌ သင်၏ ငွေဖြည့်လွှာ (ID: #${depoId}) သည် အချက်အလက် မမှန်ကန်သောကြောင့် Admin မှ ငြင်းပယ်လိုက်ပါသည်။ ပြန်လည်စစ်ဆေးပေးပါ။`);

    await ctx.answerCallbackQuery("Rejected!");
  } catch (err) {
    await ctx.reply("❌ Reject Error: " + err.message);
  }
});
//-----Noti for Done Logic-----
bot.callbackQuery("adm_setup_noti", async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;

  const keyboard = new InlineKeyboard()
    .text("➕ Add Group/Channel", "noti_add_chat")
    .text("✏️ Edit/Manage Chats", "noti_edit_chats").row()
    .text("⬅️ Back", "adm_main");

  await smartEdit(ctx, "📢 <b>Notification Broadcast Setup</b>\n\nOrder အောင်မြင်တဲ့အခါ Noti ပို့မယ့် Group ဒါမှမဟုတ် Channel တွေကို စီမံနိုင်ပါတယ်။", {
    reply_markup: keyboard
  });
});
//----Noti Add မယ်------
bot.callbackQuery("noti_add_chat", async (ctx) => {
  await ctx.env.DB.prepare("UPDATE users SET current_state = 'WAIT_CHAT_USER' WHERE user_id = ?")
    .bind(ctx.from.id).run();

  await smartEdit(ctx, "➕ <b>Group/Channel ထည့်သွင်းခြင်း</b>\n\nNoti ပို့စေချင်တဲ့ Group/Channel ရဲ့ Username ကို ပို့ပေးပါ။\n\nဥပမာ - <code>@karo_topup_channel</code>\n\n⚠️ <b>မှတ်ချက်:</b> Bot ကို အဲ့ဒီထဲမှာ Admin ခန့်ထားဖို့ လိုအပ်ပါတယ်။", {
    reply_markup: new InlineKeyboard().text("❌ မထည့်တော့ပါ", "adm_setup_noti")
  });
});
//-------Noti edit မယ်------//
bot.callbackQuery("noti_edit_chats", async (ctx) => {
  const chats = await ctx.env.DB.prepare("SELECT * FROM chat_notis").all();
  const keyboard = new InlineKeyboard();

  if (chats.results.length === 0) {
    return ctx.answerCallbackQuery("စာရင်းသွင်းထားတာ မရှိသေးပါ!");
  }

  chats.results.forEach(chat => {
    const status = chat.chat_status === 'ON' ? '🟢' : '🔴';
    keyboard.text(`${status} ${chat.chat_username}`, `manage_chat_${chat.id}`).row();
  });

  keyboard.text("⬅️ Back", "adm_setup_noti");
  await smartEdit(ctx, "📝 <b>Manage Your Chats</b>\n\nပြုပြင်လိုသည့် Chat ကို ရွေးချယ်ပါ။", { reply_markup: keyboard });
});
//----Noti On/Off & Delete---//
bot.callbackQuery(/^manage_chat_(.+)$/, async (ctx) => {
  const chatId = ctx.match[1];
  const chat = await ctx.env.DB.prepare("SELECT * FROM chat_notis WHERE id = ?").bind(chatId).first();

  const msg = `🛠 <b>Chat Setting: ${chat.chat_username}</b>\n\nStatus: <b>${chat.chat_status}</b>\n\nလုပ်ဆောင်ချက် ရွေးချယ်ပါ Admin။`;
  
  const toggleLabel = chat.chat_status === 'ON' ? "🔴 Turn OFF" : "🟢 Turn ON";
  
  const keyboard = new InlineKeyboard()
    .text(toggleLabel, `toggle_chat_${chat.id}_${chat.chat_status === 'ON' ? 'OFF' : 'ON'}`)
    .text("🗑 Delete It", `del_chat_${chat.id}`).row()
    .text("⬅️ Back", "noti_edit_chats");

  await smartEdit(ctx, msg, { reply_markup: keyboard });
});
//-----ON/OFF ပြောင်းလဲခြင်း
bot.callbackQuery(/^toggle_chat_(.+)_(.+)$/, async (ctx) => {
  const [_, id, nextStatus] = ctx.match;
  await ctx.env.DB.prepare("UPDATE chat_notis SET chat_status = ? WHERE id = ?").bind(nextStatus, id).run();
  await ctx.answerCallbackQuery(`Status changed to ${nextStatus}`);
  // ပြန်ပြဖို့ Manage Chat logic ကို ပြန်ခေါ်တာ ပိုကောင်းတယ် (သို့မဟုတ် list ပြန်သွား)
  return ctx.callbackQuery.message.editReplyMarkup({ reply_markup: undefined }); // ဥပမာအနေနဲ့ ဖျောက်ပြတာ
});
//---Bot Users List logic-----//
bot.callbackQuery("adm_usr_list", async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  // ၁။ User အားလုံးရဲ့ အရေအတွက်ကို ယူမယ်
  const totalUsers = await ctx.env.DB.prepare("SELECT COUNT(*) as count FROM users").first();
  // ၂။ Balance အများဆုံး User ၁၀ ယောက်ကို ဆွဲထုတ်မယ်
  const topRich = await ctx.env.DB.prepare(`
    SELECT user_id, username, full_name, balance 
    FROM users 
    ORDER BY balance DESC 
    LIMIT 10
  `).all();

  let msg = `📊 <b>Bot Users Statistics</b>\n\n`;
  msg += `👥 စုစုပေါင်း အသုံးပြုသူ: <b>${totalUsers.count} ယောက်</b>\n`;
  msg += `----------------------------------\n`;
  msg += `💰 <b>Wallet လက်ကျန် အများဆုံး (Top 10)</b>\n\n`;

  if (topRich.results.length === 0) {
    msg += "<i>User စာရင်း မရှိသေးပါ။</i>";
  } else {
    topRich.results.forEach((u, index) => {
      const name = u.full_name || "Unknown";
      const userTag = u.username !== "UserName မရှိပါ" ? u.username : "ID: " + u.user_id;
      msg += `${index + 1}. ${name} (${userTag})\n   └ 💰 <b>${u.balance} MMK</b>\n\n`;
    });
  }

  const keyboard = new InlineKeyboard().text("⬅️ Back to Admin", "adm_main");

  await smartEdit(ctx, msg, { reply_markup: keyboard });
});
//======================================//
//----(F) Users & Admin Logic
//————Game TopUp မည့် Logic———
bot.callbackQuery("usr_topup", async (ctx) => {
  const games = await ctx.env.DB.prepare("SELECT * FROM games").all();
  
  if (games.results.length === 0) {
    return ctx.answerCallbackQuery("လက်ရှိ ဝယ်ယူ၍မရသေးပါ။ ခေတ္တစောင့်ပေးပါ။");
  }

  const keyboard = new InlineKeyboard();
  games.results.forEach(game => {
    keyboard.text(`🎮 ${game.game_name}`, `usr_game_${game.id}`).row();
  });
  keyboard.text("⬅️ Back", "back_home");

  await smartEdit(ctx, "🛒 <b>TopUp ပြုလုပ်လိုသော ဂိမ်းကို ရွေးပါ</b>", { reply_markup: keyboard });
});
//----Game တစ်ခုခုကို TopUpဖို့ နှိပ်သောအခါ----
bot.callbackQuery(/^usr_game_(.+)$/, async (ctx) => {
  const gameId = ctx.match[1];
  const items = await ctx.env.DB.prepare("SELECT * FROM game_items WHERE game_id = ?").bind(gameId).all();

  if (items.results.length === 0) {
    return ctx.answerCallbackQuery("ဤဂိမ်းအတွက် Item များ မရှိသေးပါ။");
  }

  const keyboard = new InlineKeyboard();
  items.results.forEach(item => {
    keyboard.text(`💎 ${item.item_name} - ${item.price} MMK`, `buy_item_${item.id}`).row();
  });
  keyboard.text("⬅️ Back", "usr_topup");

  await smartEdit(ctx, "💎 <b>ဝယ်ယူလိုသည့် Items များကို ရွေးချယ်ပါ</b>", { reply_markup: keyboard });
});
//----Items တစ်ခုခုကို နှိပ်ပြီးဝယ်မည်-------
bot.callbackQuery(/^buy_item_(.+)$/, async (ctx) => {
  const itemId = ctx.match[1];
  const userId = ctx.from.id;
  // Item အချက်အလက်နဲ့ User Balance ကို တစ်ခါတည်း ဆွဲယူမယ်
  const item = await ctx.env.DB.prepare("SELECT * FROM game_items WHERE id = ?").bind(itemId).first();
  const user = await ctx.env.DB.prepare("SELECT balance FROM users WHERE user_id = ?").bind(userId).first();

  if (user.balance < item.price) {
    return ctx.reply(`⚠️ <b>လက်ကျန်ငွေ မလုံလောက်ပါ!</b>\n\nလိုအပ်သောငွေ: ${item.price} MMK\nလက်ရှိငွေ: ${user.balance} MMK\n\nကျေးဇူးပြု၍ အရင် ငွေဖြည့်ပေးပါ။`, {
      reply_markup: new InlineKeyboard().text("💵 ငွေဖြည့်မည်", "usr_deposit")
    });
  }
  // State မှတ်မယ် - temp_data ထဲမှာ ဝယ်မယ့် itemId ကို သိမ်းထားမယ်
await ctx.env.DB.prepare("UPDATE users SET current_state = 'WAIT_PLAYER_ID', temp_data = ? WHERE user_id = ?")
  .bind(itemId, userId).run();

  await smartEdit(ctx, `📝 <b>${item.item_name}</b> ဝယ်ယူရန်\n\nဂိမ်း၏ <b>Player ID</b> (သို့မဟုတ်) <b>GameId (ServerId)</b> ကို ရိုက်ပို့ပေးပါ။`, {
    reply_markup: new InlineKeyboard().text("❌ မဝယ်တော့ပါ", "usr_topup")
  });
});
// --- TopUp ကို အတည်ပြုပြီး DB ထဲ သိမ်းခြင်း Updated syntax) ---
bot.callbackQuery("confirm_topup", async (ctx) => {
  const userId = ctx.from.id;
  const user = await ctx.env.DB.prepare("SELECT current_state, temp_data, balance FROM users WHERE user_id = ?")
    .bind(userId).first();

  if (user?.current_state !== "WAIT_CONFIRM_ORDER" || !user?.temp_data) {
    return ctx.answerCallbackQuery("Error: Session expired!");
  }

  const [itemId, playerId] = user.temp_data.split("|");
  const item = await ctx.env.DB.prepare("SELECT * FROM game_items WHERE id = ?").bind(itemId).first();

  if (!item) return ctx.answerCallbackQuery("Item မတွေ့တော့ပါ!");
  
  if (user.balance < item.price) {
    return ctx.reply("⚠️ လက်ကျန်ငွေ မလုံလောက်တော့ပါ။");
  }

  // ၁။ ပိုက်ဆံနှုတ်မယ် + State ရှင်းမယ်
  await ctx.env.DB.prepare("UPDATE users SET balance = balance - ?, current_state = NULL, temp_data = NULL WHERE user_id = ?")
    .bind(item.price, userId).run();

  // ၂။ topup_orders ထဲကို data ထည့်မယ်
  const res = await ctx.env.DB.prepare(`
    INSERT INTO topup_orders (user_id, item_id, item_details, player_id, status) 
    VALUES (?, ?, ?, ?, 'pending')
  `).bind(userId, item.id, item.item_name, playerId).run();

  // D1 အတွက် အမှန်ကန်ဆုံး နည်းလမ်း (Last Row ID)
  const orderId = res.meta.last_row_id || "N/A"; 
  // ၃။ User ဆီ အောင်မြင်ကြောင်း ပြမယ်
  await smartEdit(ctx, `🚀 <b>Order တင်ခြင်း အောင်မြင်ပါသည်!</b>\n\nOrder ID: #${orderId}\nItem: ${item.item_name}\nID: <code>${playerId}</code>\n\nAdmin မှ စစ်ဆေးပြီး ၁၅ မိနစ်အတွင်း ဖြည့်သွင်းပေးပါမည်။`, {
    reply_markup: new InlineKeyboard().text("🏠 ပင်မမီနူး", "back_home")
  });

  // ၄။ Admin ဆီ Noti ပို့မယ်
  await ctx.api.sendMessage(6870403909, `🔔 <b>TopUp Order အသစ် ရောက်ရှိ!</b>\n\n🆔 Order ID: #${orderId}\n💎 Item: ${item.item_name}\n🆔 Player ID: <code>${playerId}</code>\n👤 User: ${ctx.from.first_name}`);
});
// --- ၁။ ငွေဖြည့်မည် နှိပ်လိုက်ရင် Payment ရွေးခိုင်းမယ် ---
bot.callbackQuery("usr_deposit", async (ctx) => {
  const payments = await ctx.env.DB.prepare("SELECT * FROM payments").all();
  
  if (payments.results.length === 0) {
    return ctx.answerCallbackQuery("လက်ရှိ ငွေဖြည့်၍မရသေးပါ။ ခေတ္တစောင့်ပေးပါ။");
  }

  const keyboard = new InlineKeyboard();
  payments.results.forEach(p => {
    keyboard.text(p.method_name, `pay_info_${p.id}`).row();
  });
  keyboard.text("⬅️ Back", "back_home");

  await smartEdit(ctx, "💵 <b>ငွေဖြည့်ရန် အမျိုးအစား ရွေးချယ်ပါ</b>\n\nမိမိငွေလွှဲမည့် နည်းလမ်းကို နှိပ်ပါ။", {
    reply_markup: keyboard
  });
});
// --- ၂။ ငွေဖြည့်နည်းလမ်း ရွေးပြီးရင် အချက်အလက်ပြပြီး ခလုတ်ပြမယ် ---
bot.callbackQuery(/^pay_info_(.+)$/, async (ctx) => {
  const methodId = ctx.match[1];
  const payment = await ctx.env.DB.prepare("SELECT * FROM payments WHERE id = ?").bind(methodId).first();

  const msg = `💳 <b>${payment.method_name}</b>\n\nName: ${payment.account_name}\nNo: <code>${payment.account_number}</code>\n\nငွေလွှဲပြီးပါက အောက်ကခလုတ်ကို နှိပ်ပါ။ လွှဲခဲ့သော ပမာဏ(Amount) နှင့် ScreenShot ကို တစ်ဆင့်စီ ပို့ပါခဗျာ။`;
  
  const keyboard = new InlineKeyboard()
    .text("📥 Amount နှင့် SS ပို့မည်", `depo_step1_${payment.id}`).row()
    .text("⬅️ Back", "usr_deposit");

  await smartEdit(ctx, msg, { reply_markup: keyboard });
});
// --- ၃။ Step 1: Amount (ဂဏန်းသီးသန့်) တောင်းမယ် ---
bot.callbackQuery(/^depo_step1_(.+)$/, async (ctx) => {
  const payId = ctx.match[1];
  
  await ctx.env.DB.prepare("UPDATE users SET current_state = ?, temp_data = ? WHERE user_id = ?")
    .bind(`WAIT_DEPO_AMT`, payId, ctx.from.id).run();

  await smartEdit(ctx, "💰 <b>Step (1/2)</b>\n\nလွှဲလိုက်သည့် ပမာဏကို ဂဏန်းသီးသန့် ရိုက်ပို့ပေးပါ (ဥပမာ: 5000)", {
    reply_markup: new InlineKeyboard().text("❌ မဖြည့်တော့ပါ", "usr_deposit")
  });
});

// --- ၅။ အတည်ပြုလိုက်ရင် Admin ဆီ Noti ပဲ ပို့မယ် ---
bot.callbackQuery("confirm_depo_final", async (ctx) => {
  const user = await ctx.env.DB.prepare("SELECT temp_data FROM users WHERE user_id = ?").bind(ctx.from.id).first();
  if (!user?.temp_data) return ctx.answerCallbackQuery("Data not found!");
  
  const [payId, amount, photoId] = user.temp_data.split("|");

  // ၁။ DB ထဲ သိမ်း (Status က pending ပဲ)
  const res = await ctx.env.DB.prepare(`
    INSERT INTO deposits (user_id, amount, status, screenshot_id) 
    VALUES (?, ?, 'pending', ?) RETURNING id
  `).bind(ctx.from.id, amount, photoId).run();
  
  const depoId = res.results[0].id;

  // ၂။ User ဆီက State နဲ့ Temp Data တွေ အကုန်ရှင်း
  await ctx.env.DB.prepare("UPDATE users SET current_state = NULL, temp_data = NULL WHERE user_id = ?").bind(ctx.from.id).run();

  await smartEdit(ctx, "🚀 <b>ငွေဖြည့်လွှာ ပေးပို့ပြီးပါပြီ။</b>\n\nAdmin မှ စစ်ဆေးပြီးပါက အကြောင်းကြားပေးပါမည်။", {
    reply_markup: new InlineKeyboard().text("🏠 ပင်မမီနူး", "back_home")
  });

  // ၃။ Admin ဆီကို Noti သီးသန့် ပို့မယ် (ခလုတ်မပါဘူး)
  await ctx.api.sendPhoto(ADMIN_ID, photoId, {
    caption: `🔔 <b>ငွေဖြည့်လွှာအသစ် ရောက်ရှိလာပါသည်</b>\n\n🆔 Deposit ID: #${depoId}\n👤 User: ${ctx.from.first_name}\n💰 Amount: <b>${amount} MMK</b>\n💳 Method: ${payId.toUpperCase()}\n\n🛠 <i>Admin Panel > Deposit Orders တွင် သွားရောက်စစ်ဆေးပါ။</i>`,
    parse_mode: "HTML"
  });
});
//---Wallet Logics----//
bot.callbackQuery("wallet", async (ctx) => {
  const user = await ctx.env.DB.prepare("SELECT balance FROM users WHERE user_id = ?")
    .bind(ctx.from.id).first();
    
  await smartEdit(ctx, `💰 <b>My Wallet</b>\n\nသင့်လက်ကျန်ငွေ: <b>${user?.balance || 0} MMK</b>`, {
    reply_markup: new InlineKeyboard().text("⬅️ Back", "back_home")
  });
});
//-----Deposit hidtory logic---//
bot.callbackQuery("deposit_hist", async (ctx) => {
  const history = await ctx.env.DB.prepare(`
    SELECT * FROM deposits WHERE user_id = ? ORDER BY id DESC LIMIT 5
  `).bind(ctx.from.id).all();

  if (history.results.length === 0) {
    return ctx.answerCallbackQuery("ငွေဖြည့်သွင်းထားသော မှတ်တမ်းမရှိသေးပါ!");
  }

  let msg = "📥 <b>သင်၏ နောက်ဆုံးငွေဖြည့်မှု ၅ ခု</b>\n\n";
  history.results.forEach(h => {
    const status = h.status === 'approved' ? '✅' : (h.status === 'pending' ? '⏳' : '❌');
    msg += `${status} #${h.id} | 💰 ${h.amount} MMK\n📅 ${h.created_at}\n\n`;
  });

  await smartEdit(ctx, msg, { reply_markup: new InlineKeyboard().text("⬅️ Back", "back_home") });
});
// --- TopUp History Logic ---
bot.callbackQuery("topup_hist", async (ctx) => {
  const history = await ctx.env.DB.prepare(`
    SELECT * FROM topup_orders WHERE user_id = ? ORDER BY id DESC LIMIT 5
  `).bind(ctx.from.id).all();

  if (history.results.length === 0) {
    return ctx.answerCallbackQuery("ဝယ်ယူထားသော မှတ်တမ်းမရှိသေးပါ!");
  }

  let msg = "📜 <b>သင်၏ နောက်ဆုံး TopUp ၅ ခု</b>\n\n";
  history.results.forEach(h => {
    const status = h.status === 'done' ? '✅' : (h.status === 'pending' ? '⏳' : '❌');
    msg += `${status} #${h.id} | 💎 ${h.item_details}\n🆔 ID: <code>${h.player_id}</code>\n📅 ${h.created_at}\n\n`;
  });

  await smartEdit(ctx, msg, { 
    reply_markup: new InlineKeyboard().text("⬅️ Back", "back_home") 
  });
});
//--(F)--Message text ------//
bot.on("message:text", async (ctx) => {
  const userId = ctx.from.id;// ဒီမှာ userId ကိုတစ်ခါတည်း ကြေညာထားလိုက်ပြီ
   const username = ctx.from.username ? `@${ctx.from.username}` : "UserName မရှိပါ";
  const fullName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" ") || "UserName မရှိပါ";// Username မရှိရင်

  const user = await ctx.env.DB.prepare("SELECT current_state FROM users WHERE user_id = ?")
    .bind(ctx.from.id).first();
//----Admin State---//
  if (user?.current_state?.startsWith("WAIT_PAY_")) {
    // 🔥 ဒီနေရာမှာ Type ညှိလိုက်မယ်
    if (Number(ctx.from.id) !== Number(ADMIN_ID)) {
        console.log("Admin ID mismatch!", ctx.from.id, ADMIN_ID);
        return;
    }
      
    const type = user.current_state.split("_")[2];
    const text = ctx.message.text;

    if (!text.includes("=")) {
      return ctx.reply("❌ ပုံစံမမှန်ပါ။ <code>နံပါတ် = အမည်</code> အတိုင်း ပို့ပေးပါ။");
    }

    // 🔥 INSERT OR REPLACE သုံးလိုက်မယ်၊ ဒါဆိုရင် ID ရှိရှိမရှိရှိ အမြဲဝင်တယ်
    await ctx.env.DB.prepare(`
      INSERT INTO users (user_id, full_name, temp_data, current_state)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
      temp_data = excluded.temp_data
    `).bind(ctx.from.id, ctx.from.first_name, text, user.current_state).run();

    const keyboard = new InlineKeyboard()
      .text("✅ အတည်ပြုမည်", `confirm_pay_${type}`)
      .text("❌ မပြင်တော့ပါ", "adm_payment");

    await ctx.reply(`🔍 <b>စစ်ဆေးပေးပါ Admin</b>\n\nအချက်အလက်: ${text}`, {
      parse_mode: "HTML",
      reply_markup: keyboard
    });
            }

    // Game Item အသစ်ကို DB ထဲ သိမ်းမယ့်အပိုင်း
  if (user?.current_state === "WAIT_ADD_ITEM") {
    if (userId !== ADMIN_ID) return;
    const text = ctx.message.text;

    if (!text.includes("=")) {
      return ctx.reply("❌ ပုံစံမမှန်ပါ။ <code>Item အမည် = ဈေးနှုန်း</code> ပုံစံအတိုင်း ပို့ပေးပါ။(=) ညီမျှခြင်းလေးတော့ သေချာရေးထည့် သားကြီး။");
    }

    const [itemName, price] = text.split("=").map(i => i.trim());
    const gameId = user.temp_data; // temp_data ထဲမှာ သိမ်းထားတဲ့ gameId ကို ပြန်ယူတယ်

    if (isNaN(parseInt(price))) {
      return ctx.reply("❌ ဈေးနှုန်းကို ဂဏန်းသီးသန့်ပဲ ထည့်ပေးပါ သားကြီး။");
    }

    await ctx.env.DB.prepare("INSERT INTO game_items (game_id, item_name, price) VALUES (?, ?, ?)")
      .bind(gameId, itemName, parseInt(price)).run();

    await ctx.env.DB.prepare("UPDATE users SET current_state = NULL, temp_data = NULL WHERE user_id = ?").bind(userId).run();

    return ctx.reply(`✅ <b>${itemName}</b> ကို ${price} MMK ဖြင့် ထည့်သွင်းပြီးပါပြီ။`, {
      reply_markup: new InlineKeyboard().text("◀ Back", `adm_manage_game_${gameId}`)
    });
  }
    // ဈေးနှုန်းပြင်ဆင်ခြင်း သိမ်းဆည်းသည့်အပိုင်း
  if (user?.current_state === "WAIT_EDIT_PRICE") {
    if (userId !== ADMIN_ID) return;
    
    const newPrice = parseInt(ctx.message.text);
    const itemId = user.temp_data; // temp_data ထဲက itemId ကို ပြန်ယူတယ်

    if (isNaN(newPrice)) {
      return ctx.reply("⚠️ ဈေးနှုန်းကို ဂဏန်းသီးသန့်ပဲ ရိုက်ပို့ပေးပါ Admin။");
    }

    // DB မှာ ဈေးနှုန်းအသစ်ကို Update လုပ်မယ်
    const item = await ctx.env.DB.prepare("SELECT game_id, item_name FROM game_items WHERE id = ?").bind(itemId).first();
    
    await ctx.env.DB.prepare("UPDATE game_items SET price = ? WHERE id = ?")
      .bind(newPrice, itemId).run();

    // State ရှင်းမယ်
    await ctx.env.DB.prepare("UPDATE users SET current_state = NULL, temp_data = NULL WHERE user_id = ?")
      .bind(userId).run();

    return ctx.reply(`✅ <b>${item.item_name}</b> ရဲ့ ဈေးနှုန်းကို <b>${newPrice} MMK</b> သို့ ပြောင်းလဲပြီးပါပြီ။`, {
      reply_markup: new InlineKeyboard().text("⬅️ ပြန်သွားမယ်", `adm_manage_game_${item.game_id}`)
    });
  }
  //----Noti Add Sate------//
  if (user?.current_state === "WAIT_CHAT_USER") {
  if (userId !== ADMIN_ID) return;
  const chatUsername = ctx.message.text.trim();

  if (!chatUsername.startsWith("@")) {
    return ctx.reply("❌ Username သည် @ နဲ့ စရပါမယ် သားကြီး။");
  }

  try {
    await ctx.env.DB.prepare("INSERT INTO chat_notis (chat_username) VALUES (?)").bind(chatUsername).run();
    await ctx.env.DB.prepare("UPDATE users SET current_state = NULL WHERE user_id = ?").bind(userId).run();
    
    return ctx.reply(`✅ <b>${chatUsername}</b> ကို စာရင်းသွင်းပြီးပါပြီ။\n\nBot ကို Admin ခန့်ထားဖို့ မမေ့နဲ့ဦးနော်။ Edit ထဲမှာ သွားပြီး Noti ON လိုက်ပါ။`, {
      reply_markup: new InlineKeyboard().text("⬅️ ပြန်သွားမယ်", "adm_setup_noti")
    });
  } catch (e) {
    return ctx.reply("❌ ဒီ Chat က ရှိပြီးသား ဖြစ်နေတယ် သားကြီး။");
  }
}
//============================//
//-------Both State-------//
//==========================//
    if (user?.current_state === "WAIT_DEPO_AMT") {
    const amount = parseInt(ctx.message.text);
    if (isNaN(amount) || amount <= 0) {
      return ctx.reply("⚠️ ပမာဏကို ဂဏန်းသီးသန့် မှန်ကန်စွာ ရိုက်ပို့ပေးပါ (ဥပမာ - 5000)");
    }
    // temp_data ထဲမှာ {payId}|{amount} ဆိုပြီး သိမ်းထားမယ်
    const newData = `${user.temp_data}|${amount}`;
    await ctx.env.DB.prepare("UPDATE users SET current_state = 'WAIT_DEPO_SS', temp_data = ? WHERE user_id = ?")
      .bind(newData, userId).run();

    await ctx.reply(`✅ ပမာဏ <b>${amount} MMK</b> ရရှိပါပြီ။\n\n<b>Step (2/2)</b>\nငွေလွှဲပြေစာ (Screenshot) ကို ပို့ပေးပါ။`, { parse_mode: "HTML" });
    return;
  }
  //---Item ဝယ်တဲ့အခါ ID တောင်းမယ့် State---
    if (user?.current_state === "WAIT_PLAYER_ID") {
    const playerId = ctx.message.text;
    const itemId = user.temp_data;

    const item = await ctx.env.DB.prepare("SELECT * FROM game_items WHERE id = ?").bind(itemId).first();

    // Confirm လုပ်ဖို့ data တွေကို ခဏသိမ်းထားမယ် {itemId}|{playerId}
    await ctx.env.DB.prepare("UPDATE users SET current_state = 'WAIT_CONFIRM_ORDER', temp_data = ? WHERE user_id = ?")
      .bind(`${itemId}|${playerId}`, userId).run();

    const keyboard = new InlineKeyboard()
      .text("✅ အတည်ပြုမည်", "confirm_topup").row()
      .text("✏️ ID ပြန်ပြင်မည်", `buy_item_${itemId}`) // နဂို ID တောင်းတဲ့ အဆင့်ကို ပြန်လွှတ်တာ
      .text("❌ မဝယ်တော့ပါ", "usr_topup");

    return ctx.reply(`🔍 <b>အချက်အလက် စစ်ဆေးပါ</b>\n\n💎 ပစ္စည်း: <b>${item.item_name}</b>\n💰 ဈေးနှုန်း: <b>${item.price} MMK</b>\n🆔 Player ID: <code>${playerId}</code>\n\nအထက်ပါ အချက်အလက်များ မှန်ကန်ပါက 'အတည်ပြုမည်' ကို နှိပ်ပါ။`, {
      parse_mode: "HTML",
      reply_markup: keyboard
    });
  }

});
// --- (G) Screenshot (Photo) ဖမ်းပြီး Confirm ခိုင်းမယ် ---
bot.on("message:photo", async (ctx) => {
  const userId = ctx.from.id;
  const user = await ctx.env.DB.prepare("SELECT current_state, temp_data FROM users WHERE user_id = ?").bind(userId).first();

  if (user?.current_state === "WAIT_DEPO_SS") {
    const [payId, amount] = user.temp_data.split("|");
    const photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;

    // Confirm ခလုတ်ပြမယ်
    const keyboard = new InlineKeyboard()
      .text("✅ အားလုံးမှန်ကန်သည်", `confirm_depo_final`).row()
      .text("❌ ပယ်ဖျက်မည်", "back_home");

    await ctx.replyWithPhoto(photoId, {
      caption: `🔍 <b>အချက်အလက် စစ်ဆေးပါ</b>\n\n💰 Amount: <b>${amount} MMK</b>\n💳 Method: ${payId.toUpperCase()}\n\nအထက်ပါ အချက်အလက်များ မှန်ကန်ပါက အတည်ပြုမည်ကို နှိပ်ပါ။`,
      parse_mode: "HTML",
      reply_markup: keyboard
    });
    
    // နောက်ဆုံးအဆင့်အတွက် data ပြန်သိမ်း
    await ctx.env.DB.prepare("UPDATE users SET temp_data = ? WHERE user_id = ?")
      .bind(`${user.temp_data}|${photoId}`, userId).run();
  }
});
  return bot;
}
// ==========================================
// ၂။ CLOUDFLARE WORKER EXPORT (GPT METHOD)
export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Bot is active! 🚀");
    }

    try {
      const bot = createBot(env);
      const update = await request.json();

      // Bot ကို အလုပ်မခိုင်းခင် အရင်နှိုးလိုက်တာ (Initialize လုပ်တာ)
      await bot.init(); 

      // ပြီးမှ Update ကို လက်ခံခိုင်းမယ်
      await bot.handleUpdate(update);

      return new Response("ok", { status: 200 });
    } catch (e) {
      console.error("Worker Error:", e.message);
      return new Response("ok", { status: 200 });
    }
  },
};
