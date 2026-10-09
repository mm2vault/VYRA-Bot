const fs = require('node:fs');
const path = require('node:path');
const {
  SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder,
  TextInputStyle
} = require('discord.js');

const PURPLE = 0x8d3cff;
const PINK = 0xe879f9;
const dataPath = path.join(process.cwd(), 'vyra-data.json');
const data = { users: {}, lastReleaseId: null };
try {
  if (fs.existsSync(dataPath)) {
    const saved = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    data.users = saved.users || {};
    data.lastReleaseId = saved.lastReleaseId || null;
  }
} catch (error) { console.error('VYRA data load:', error.message); }
let saveTimer;
function saveData() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { fs.writeFileSync(dataPath, JSON.stringify(data, null, 2)); }
    catch (error) { console.error('VYRA data save:', error.message); }
  }, 250);
}
function embed(title, description, color = PURPLE) {
  return new EmbedBuilder().setColor(color).setTitle(title).setDescription(description).setTimestamp();
}
function levelForXp(xp) { return Math.floor(Math.sqrt(Math.max(0, xp) / 100)); }
function userData(guildId, userId) {
  const key = guildId + ':' + userId;
  if (!data.users[key]) data.users[key] = { xp: 0, lastMessageAt: 0, lastDailyAt: 0 };
  return data.users[key];
}
function ticketPanel() {
  return {
    embeds: [embed('🎫 VYRA Destek Merkezi', 'Bir sorun mu yaşıyorsun? Aşağıdaki butona bas; sana özel bir destek kanalı açılır. Aynı konu için birden fazla bilet açma. 💜')],
    components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('vyra:ticket:create').setLabel('Destek bileti aç').setEmoji('🎫').setStyle(ButtonStyle.Primary))]
  };
}
const commands = [
  new SlashCommandBuilder().setName('ticket-panel').setDescription('Destek bileti panelini gönderir.').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  new SlashCommandBuilder().setName('suggest').setDescription('VYRA için bir öneri gönder.'),
  new SlashCommandBuilder().setName('bug').setDescription('Bir hata bildir.'),
  new SlashCommandBuilder().setName('level').setDescription('XP seviyeni gösterir.').addUserOption(o => o.setName('uye').setDescription('Seviyesine bakılacak üye').setRequired(false)),
  new SlashCommandBuilder().setName('leaderboard').setDescription('XP sıralamasını gösterir.'),
  new SlashCommandBuilder().setName('daily').setDescription('Günlük XP ödülünü al.'),
  new SlashCommandBuilder().setName('profile').setDescription('VYRA topluluk profilini gösterir.').addUserOption(o => o.setName('uye').setDescription('Profili görüntülenecek üye').setRequired(false)),
  new SlashCommandBuilder().setName('poll').setDescription('Topluluk anketi oluşturur.').addStringOption(o => o.setName('soru').setDescription('Anket sorusu').setRequired(true).setMaxLength(180)).addStringOption(o => o.setName('secenekler').setDescription('Virgülle ayırarak 2-5 seçenek yaz').setRequired(true).setMaxLength(500)),
  new SlashCommandBuilder().setName('announce').setDescription('Duyuru kanalına mesaj gönderir.').addStringOption(o => o.setName('baslik').setDescription('Başlık').setRequired(true).setMaxLength(200)).addStringOption(o => o.setName('mesaj').setDescription('Duyuru içeriği').setRequired(true).setMaxLength(3500)).setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
].map(c => c.toJSON());

async function setup(guild, botUser) {
  const groups = [
    ['🎫 DESTEK BİLETLERİ', []],
    ['📌 BAŞLANGIÇ', [['👋・hoş-geldin', 'Yeni üyeler'], ['📜・kurallar', 'Topluluk kuralları'], ['📢・duyurular', 'Resmî duyurular'], ['📰・güncellemeler', 'Sürüm notları'], ['🔗・bağlantılar', 'Resmî bağlantılar']]],
    ['🎧 VYRA', [['💜・vyra', 'VYRA tanıtımı'], ['📱・uygulama', 'Uygulama rehberi'], ['⬇️・indirme', 'Resmî indirme bağlantısı'], ['✨・özellikler', 'VYRA özellikleri'], ['💡・öneriler', 'Topluluk önerileri']]],
    ['🛠️ DESTEK', [['❓・yardım', 'Yardım ve destek bileti'], ['🐛・hata-bildirim', 'Hata bildirimleri'], ['📩・geri-bildirim', 'Geri bildirimler']]]
  ];
  for (const [name, channels] of groups) {
    let category = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === name);
    if (!category) category = await guild.channels.create({ name, type: ChannelType.GuildCategory });
    for (const [channelName, topic] of channels) {
      let channel = guild.channels.cache.find(c => c.parentId === category.id && c.name === channelName);
      if (!channel) channel = await guild.channels.create({ name: channelName, type: ChannelType.GuildText, parent: category.id, topic });
    }
  }
  const help = guild.channels.cache.find(c => c.name === '❓・yardım' && c.type === ChannelType.GuildText);
  if (help) {
    const recent = await help.messages.fetch({ limit: 10 }).catch(() => null);
    const hasPanel = recent && recent.some(m => m.author.id === botUser.id && m.components.some(row => row.components.some(c => c.customId === 'vyra:ticket:create')));
    if (!hasPanel) await help.send(ticketPanel());
  }
  const welcome = guild.channels.cache.find(c => c.name === '👋・hoş-geldin' && c.type === ChannelType.GuildText);
  const rules = guild.channels.cache.find(c => c.name === '📜・kurallar' && c.type === ChannelType.GuildText);
  const info = [
    [rules, '📜 VYRA Topluluk Kuralları', '1. Herkese saygılı davran.\n2. Spam ve izinsiz reklam yapma.\n3. Taciz ve kişisel bilgi paylaşımı yasaktır.\n4. Sorunlar için destek bileti aç.\n5. Şüpheli indirme bağlantılarına dikkat et.\n6. Discord kurallarına uy. 💜'],
    [guild.channels.cache.find(c => c.name === '💜・vyra'), '💜 VYRA’ya hoş geldin', 'Müziği sadece dinleme. Hisset. 🎧\nResmî site: https://mm2vault.github.io/VYRA-Website/'],
    [guild.channels.cache.find(c => c.name === '⬇️・indirme'), '⬇️ VYRA İndirme Merkezi', 'Resmî site ve indirme bağlantıları: https://mm2vault.github.io/VYRA-Website/\nYeni sürümler burada duyurulur.'],
    [guild.channels.cache.find(c => c.name === '📱・uygulama'), '📱 VYRA Uygulaması', 'Yeni sürüm ve kullanım bilgileri için indirme kanalını kontrol et. Sorun yaşarsan destek bileti aç.'],
    [guild.channels.cache.find(c => c.name === '✨・özellikler'), '✨ VYRA Özellikleri', 'Yeni özellikler ve geliştirmeler burada duyurulacak. Fikirlerini öneriler kanalına gönderebilirsin.'],
    [guild.channels.cache.find(c => c.name === '🔗・bağlantılar'), '🔗 Resmî Bağlantılar', 'VYRA sitesi: https://mm2vault.github.io/VYRA-Website/\nYalnızca resmî bağlantılara güven.'],
    [guild.channels.cache.find(c => c.name === '❓・yardım'), '❓ Yardım ve Destek', 'Önce uygulamanın güncel sürümde olduğunu kontrol et. Hata bildir veya aşağıdaki butondan özel destek bileti aç.']
  ];
  for (const [channel, title, body] of info) {
    if (!channel) continue;
    const recent = await channel.messages.fetch({ limit: 10 }).catch(() => null);
    const alreadySeeded = recent && recent.some(m => m.author.id === botUser.id && m.embeds.some(e => e.footer && e.footer.text === 'VYRA_SETUP_CONTENT'));
    if (!alreadySeeded) await channel.send({ embeds: [embed(title, body).setFooter({ text: 'VYRA_SETUP_CONTENT • VYRA Community' })] });
  }
  if (welcome) {
    const recent = await welcome.messages.fetch({ limit: 10 }).catch(() => null);
    if (!recent || !recent.some(m => m.author.id === botUser.id && m.embeds.some(e => e.footer && e.footer.text === 'VYRA_SETUP_CONTENT'))) {
      await welcome.send({ embeds: [embed('💜 VYRA Topluluğuna Hoş Geldin!', 'Yeni üyeler burada karşılanır. Kuralları oku, kendini tanıt ve topluluğa katıl! 🎧').setFooter({ text: 'VYRA_SETUP_CONTENT • VYRA Community' })] });
    }
  }
}

async function openTicket(interaction, client) {
  const guild = interaction.guild;
  const existing = guild.channels.cache.find(c => c.type === ChannelType.GuildText && c.topic === 'VYRA_TICKET_OWNER:' + interaction.user.id);
  if (existing) return interaction.reply({ content: '💜 Açık destek biletin: ' + existing, ephemeral: true });
  let category = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === '🎫 DESTEK BİLETLERİ');
  if (!category) category = await guild.channels.create({ name: '🎫 DESTEK BİLETLERİ', type: ChannelType.GuildCategory });
  const moderator = guild.roles.cache.find(r => r.name === '🛡️ Moderator');
  const name = interaction.user.username.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 16) || 'uye';
  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
    { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] }
  ];
  if (moderator) overwrites.push({ id: moderator.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
  const channel = await guild.channels.create({ name: 'ticket-' + name, type: ChannelType.GuildText, parent: category.id, topic: 'VYRA_TICKET_OWNER:' + interaction.user.id, permissionOverwrites: overwrites });
  const closeRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('vyra:ticket:close:' + interaction.user.id).setLabel('Bileti kapat').setEmoji('🔒').setStyle(ButtonStyle.Danger));
  await channel.send({ content: interaction.user + (moderator ? ' ' + moderator : ''), embeds: [embed('💜 Destek biletin açıldı', 'Sorununu ayrıntılı anlat; ekip yardımcı olacak. Şifre veya token gibi gizli bilgileri paylaşma.')] , components: [closeRow] });
  return interaction.reply({ content: '✅ Biletin açıldı: ' + channel, ephemeral: true });
}


async function checkRelease(client) {
  const channelId = process.env.RELEASE_CHANNEL_ID;
  if (!channelId) return;
  try {
    const response = await fetch('https://api.github.com/repos/mm2vault/VYRA/releases/latest', {
      headers: { 'User-Agent': 'VYRA-Discord-Bot', 'Accept': 'application/vnd.github+json' }
    });
    if (!response.ok) throw new Error('GitHub Releases API returned ' + response.status);
    const release = await response.json();
    if (!release || !release.id || release.draft || release.prerelease) return;
    if (!data.lastReleaseId) {
      data.lastReleaseId = release.id;
      saveData();
      return;
    }
    if (String(data.lastReleaseId) === String(release.id)) return;
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;
    await channel.send({
      content: '💜 **VYRA güncellendi!**',
      embeds: [embed('🚀 Yeni VYRA Sürümü: ' + (release.name || release.tag_name),
        (release.body || 'Bu sürüm için ayrıntılı not paylaşılmadı.').slice(0, 2800) +
        '\n\n[⬇️ Sürümü görüntüle](' + release.html_url + ')\n[🌐 VYRA sitesi](https://mm2vault.github.io/VYRA-Website/)', PINK)]
    });
    data.lastReleaseId = release.id;
    saveData();
  } catch (error) { console.error('VYRA release check:', error.message); }
}

function attach(client) {
  client.on('messageCreate', async message => {
    if (!message.guild || message.author.bot) return;
    const record = userData(message.guild.id, message.author.id);
    const now = Date.now();
    if (now - (record.lastMessageAt || 0) < 60000) return;
    const before = levelForXp(record.xp || 0);
    record.lastMessageAt = now;
    record.xp = (record.xp || 0) + 10 + Math.floor(Math.random() * 11);
    saveData();
    const level = levelForXp(record.xp);
    if (level > before) await message.channel.send({ embeds: [embed('✨ Seviye atladın!', message.author + ' Seviye ' + level + ' seviyesine ulaştı! 💜', PINK)] }).catch(() => {});
  });

  client.on('interactionCreate', async interaction => {
    try {
      if (interaction.isButton()) {
        if (interaction.customId === 'vyra:ticket:create') return await openTicket(interaction, client);
        if (interaction.customId.startsWith('vyra:ticket:close:')) {
          const ownerId = interaction.customId.split(':').pop();
          const staff = (interaction.memberPermissions && interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels)) || (interaction.member && interaction.member.roles && interaction.member.roles.cache.some(role => role.name === '🛡️ Moderator'));
          if (interaction.user.id !== ownerId && !staff) return interaction.reply({ content: 'Bu bileti yalnızca sahibi veya destek ekibi kapatabilir.', ephemeral: true });
          const channel = interaction.channel;
          await interaction.reply({ content: '🔒 Bilet kapatılıyor; kanal arşivleniyor.', ephemeral: true });
          await channel.setName(('closed-' + channel.name).slice(0, 90)).catch(() => {});
          await channel.setTopic('VYRA_TICKET_CLOSED:' + ownerId).catch(() => {});
          await channel.permissionOverwrites.edit(ownerId, { SendMessages: false }).catch(() => {});
          return;
        }
      }
      if (interaction.isModalSubmit()) {
        const suggestion = interaction.customId === 'vyra:suggest:modal';
        const bug = interaction.customId === 'vyra:bug:modal';
        if (!suggestion && !bug) return;
        const title = interaction.fields.getTextInputValue(suggestion ? 'suggest:title' : 'bug:title');
        const details = interaction.fields.getTextInputValue(suggestion ? 'suggest:details' : 'bug:details');
        const targetName = suggestion ? '💡・öneriler' : '🐛・hata-bildirim';
        const channel = interaction.guild.channels.cache.find(c => c.name === targetName && c.type === ChannelType.GuildText);
        if (!channel) return interaction.reply({ content: 'Kanal bulunamadı. Yönetici /setup çalıştırsın.', ephemeral: true });
        await channel.send({ embeds: [embed((suggestion ? '💡 Yeni Öneri: ' : '🐛 Hata Bildirimi: ') + title, details + '\n\nGönderen: ' + interaction.user, suggestion ? PINK : 0xff5c7a)] });
        return interaction.reply({ content: suggestion ? '💜 Önerin iletildi, teşekkürler!' : '✅ Hata bildirimin iletildi.', ephemeral: true });
      }
      if (!interaction.isChatInputCommand()) return;
      if (interaction.commandName === 'ticket-panel') {
        const channel = interaction.guild.channels.cache.find(c => c.name === '❓・yardım' && c.type === ChannelType.GuildText) || interaction.channel;
        await channel.send(ticketPanel());
        return interaction.reply({ content: '✅ Destek paneli gönderildi: ' + channel, ephemeral: true });
      }
      if (interaction.commandName === 'suggest' || interaction.commandName === 'bug') {
        const suggestion = interaction.commandName === 'suggest';
        const modal = new ModalBuilder().setCustomId(suggestion ? 'vyra:suggest:modal' : 'vyra:bug:modal').setTitle(suggestion ? 'VYRA için öneri' : 'Hata bildir');
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId(suggestion ? 'suggest:title' : 'bug:title').setLabel(suggestion ? 'Öneri başlığı' : 'Hata başlığı').setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId(suggestion ? 'suggest:details' : 'bug:details').setLabel(suggestion ? 'Öneri ayrıntısı' : 'Hata nasıl oluşuyor?').setStyle(TextInputStyle.Paragraph).setMaxLength(1500).setRequired(true))
        );
        return interaction.showModal(modal);
      }
      if (interaction.commandName === 'daily') {
        const record = userData(interaction.guild.id, interaction.user.id);
        const now = Date.now();
        const cooldown = 24 * 60 * 60 * 1000;
        const remaining = cooldown - (now - (record.lastDailyAt || 0));
        if (remaining > 0) {
          const hours = Math.floor(remaining / 3600000);
          const minutes = Math.ceil((remaining % 3600000) / 60000);
          return interaction.reply({ content: '⏳ Günlük ödülünü zaten aldın. **' + hours + ' saat ' + minutes + ' dakika** sonra tekrar gel!', ephemeral: true });
        }
        const reward = 50 + Math.floor(Math.random() * 51);
        record.xp = (record.xp || 0) + reward;
        record.lastDailyAt = now;
        saveData();
        return interaction.reply({ embeds: [embed('🎁 Günlük ödülün hazır!', interaction.user + ' **' + reward + ' XP** kazandın!\nToplam XP: **' + record.xp + '** 💜', PINK)] });
      }
      if (interaction.commandName === 'profile') {
        const user = interaction.options.getUser('uye') || interaction.user;
        const record = userData(interaction.guild.id, user.id);
        const xp = record.xp || 0;
        const level = levelForXp(xp);
        const next = (level + 1) * (level + 1) * 100;
        const floor = level * level * 100;
        const progress = Math.max(0, Math.min(10, Math.floor(((xp - floor) / Math.max(1, next - floor)) * 10)));
        return interaction.reply({ embeds: [embed('💜 ' + user.username + ' • VYRA Profili', '🏆 **Seviye:** ' + level + '\n✨ **Toplam XP:** ' + xp + '\n📈 **Sonraki seviye:** ' + next + ' XP\n' + '▰'.repeat(progress) + '▱'.repeat(10 - progress), PINK)] });
      }
      if (interaction.commandName === 'poll') {
        const question = interaction.options.getString('soru', true);
        const options = interaction.options.getString('secenekler', true).split(',').map(s => s.trim()).filter(Boolean);
        if (options.length < 2 || options.length > 5 || new Set(options.map(s => s.toLowerCase())).size !== options.length) {
          return interaction.reply({ content: '❌ Virgülle ayrılmış, birbirinden farklı 2-5 seçenek yazmalısın.', ephemeral: true });
        }
        const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
        const description = options.map((option, i) => emojis[i] + ' ' + option).join('\n\n');
        const message = await interaction.channel.send({ embeds: [embed('📊 ' + question, description + '\n\n*Anketi başlatan: ' + interaction.user.username + '*', PINK)] });
        for (let i = 0; i < options.length; i++) await message.react(emojis[i]);
        return interaction.reply({ content: '✅ Anket oluşturuldu: ' + message.url, ephemeral: true });
      }
      if (interaction.commandName === 'level') {
        const user = interaction.options.getUser('uye') || interaction.user;
        const record = userData(interaction.guild.id, user.id);
        const level = levelForXp(record.xp || 0);
        const floor = level * level * 100;
        const next = (level + 1) * (level + 1) * 100;
        const progress = Math.max(0, Math.min(10, Math.floor((((record.xp || 0) - floor) / Math.max(1, next - floor)) * 10)));
        return interaction.reply({ embeds: [embed('✨ ' + user.username + ' • Seviye ' + level, 'XP: **' + (record.xp || 0) + '**\nİlerleme: ' + '▰'.repeat(progress) + '▱'.repeat(10 - progress) + '\nSonraki seviye: **' + next + ' XP**')] });
      }
      if (interaction.commandName === 'leaderboard') {
        const entries = Object.entries(data.users).filter(e => e[0].startsWith(interaction.guild.id + ':')).map(e => ({ id: e[0].split(':')[1], xp: e[1].xp || 0 })).sort((a, b) => b.xp - a.xp).slice(0, 10);
        if (!entries.length) return interaction.reply({ embeds: [embed('🏆 VYRA XP Sıralaması', 'Henüz sıralama oluşmadı. Sohbete katıl!')] });
        const lines = await Promise.all(entries.map(async (e, i) => {
          const user = await client.users.fetch(e.id).catch(() => null);
          return '**' + (i + 1) + '.** ' + (user ? user.username : 'Üye') + ' — **' + e.xp + ' XP** (Seviye ' + levelForXp(e.xp) + ')';
        }));
        return interaction.reply({ embeds: [embed('🏆 VYRA XP Sıralaması', lines.join('\n'))] });
      }
      if (interaction.commandName === 'announce') {
        const title = interaction.options.getString('baslik', true);
        const body = interaction.options.getString('mesaj', true);
        const channel = interaction.guild.channels.cache.find(c => c.name === '📢・duyurular' && c.type === ChannelType.GuildText);
        if (!channel) return interaction.reply({ content: 'Duyuru kanalı bulunamadı. Önce /setup çalıştır.', ephemeral: true });
        await channel.send({ embeds: [embed('📢 ' + title, body, PINK)] });
        return interaction.reply({ content: '✅ Duyuru paylaşıldı: ' + channel, ephemeral: true });
      }
    } catch (error) {
      console.error('Community feature error:', error);
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) await interaction.reply({ content: 'Bir hata oluştu. Bot izinlerini ve kanal ayarlarını kontrol et.', ephemeral: true }).catch(() => {});
    }
  });
}
module.exports = { commands, setup, attach, checkRelease };
