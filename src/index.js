require('dotenv').config();
const {
  Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder,
  PermissionFlagsBits, ChannelType, EmbedBuilder
} = require('discord.js');
const community = require('./community');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
if (!token || !clientId || !guildId) {
  console.error('Missing environment variables: DISCORD_TOKEN, CLIENT_ID, GUILD_ID');
  process.exit(1);
}

const commands = [
  new SlashCommandBuilder().setName('vyra').setDescription('VYRA hakkında bilgi.'),
  new SlashCommandBuilder().setName('download').setDescription('VYRA indirme bağlantısı.'),
  new SlashCommandBuilder().setName('help').setDescription('Bot komutları.'),
  new SlashCommandBuilder().setName('server').setDescription('Sunucu bilgileri.'),
  new SlashCommandBuilder().setName('report').setDescription('Bir üyeyi yetkililere bildirir.').addUserOption(o => o.setName('uye').setDescription('Bildirilecek üye').setRequired(true)).addStringOption(o => o.setName('sebep').setDescription('Bildirim sebebi').setRequired(true).setMaxLength(500)),
  new SlashCommandBuilder().setName('setup').setDescription('VYRA sunucu yapısını kurar.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('clear').setDescription('Son mesajları siler.').addIntegerOption(o => o.setName('miktar').setDescription('1-100').setMinValue(1).setMaxValue(100).setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  new SlashCommandBuilder().setName('kick').setDescription('Üyeyi sunucudan atar.').addUserOption(o => o.setName('uye').setDescription('Atılacak üye').setRequired(true)).addStringOption(o => o.setName('sebep').setDescription('İşlem sebebi').setMaxLength(400)).setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  new SlashCommandBuilder().setName('ban').setDescription('Üyeyi sunucudan yasaklar.').addUserOption(o => o.setName('uye').setDescription('Yasaklanacak üye').setRequired(true)).addStringOption(o => o.setName('sebep').setDescription('İşlem sebebi').setMaxLength(400)).setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  new SlashCommandBuilder().setName('warn').setDescription('Üyeye uyarı verir ve kayda geçirir.').addUserOption(o => o.setName('uye').setDescription('Uyarılacak üye').setRequired(true)).addStringOption(o => o.setName('sebep').setDescription('Uyarı sebebi').setRequired(true).setMaxLength(400)).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  new SlashCommandBuilder().setName('timeout').setDescription('Üyeyi geçici olarak susturur.').addUserOption(o => o.setName('uye').setDescription('Susturulacak üye').setRequired(true)).addIntegerOption(o => o.setName('dakika').setDescription('1-10080 dakika').setMinValue(1).setMaxValue(10080).setRequired(true)).addStringOption(o => o.setName('sebep').setDescription('İşlem sebebi').setMaxLength(400)).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  new SlashCommandBuilder().setName('untimeout').setDescription('Üyenin susturmasını kaldırır.').addUserOption(o => o.setName('uye').setDescription('Susturması kaldırılacak üye').setRequired(true)).addStringOption(o => o.setName('sebep').setDescription('İşlem sebebi').setMaxLength(400)).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  new SlashCommandBuilder().setName('slowmode').setDescription('Bu kanala yavaş mod uygular.').addIntegerOption(o => o.setName('saniye').setDescription('0-21600 saniye; 0 kapatır').setMinValue(0).setMaxValue(21600).setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  ...community.commands
].map(c => typeof c.toJSON === 'function' ? c.toJSON() : c);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages]
});
async function register() {
  const rest = new REST({ version: '10' }).setToken(token);
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
}
function staffLog(guild, title, description, color = 0x8d3cff) {
  const channel = guild.channels.cache.find(c => c.name === '📋・mod-log' && c.type === ChannelType.GuildText);
  if (!channel) return Promise.resolve();
  const e = new EmbedBuilder().setColor(color).setTitle(title).setDescription(description.slice(0, 4000)).setTimestamp();
  return channel.send({ embeds: [e] }).catch(err => console.error('Moderation log:', err.message));
}
async function setup(guild) {
  const roles = [['💜 VYRA Member', 0x8d3cff], ['⭐ Early Supporter', 0xf09bff], ['🎵 Music Lover', 0xbd67ff], ['🔧 Developer', 0x5865f2], ['🛡️ Moderator', 0x57f287]];
  for (const [name, color] of roles) {
    if (!guild.roles.cache.some(r => r.name === name)) await guild.roles.create({ name, color, reason: 'VYRA sunucu kurulumu' });
  }
  const groups = [
    ['📌 BAŞLANGIÇ', ['👋・hoş-geldin', '📜・kurallar', '📢・duyurular', '📰・güncellemeler', '🔗・bağlantılar']],
    ['🎧 VYRA', ['💜・vyra', '📱・uygulama', '⬇️・indirme', '✨・özellikler', '💡・öneriler']],
    ['💬 TOPLULUK', ['💬・sohbet', '🎵・müzik-sohbeti', '🎶・şarkı-önerileri', '📸・paylaşımlar']],
    ['🛠️ DESTEK', ['❓・yardım', '🐛・hata-bildirim', '📩・geri-bildirim']]
  ];
  for (const [groupName, names] of groups) {
    let parent = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === groupName);
    if (!parent) parent = await guild.channels.create({ name: groupName, type: ChannelType.GuildCategory });
    for (const name of names) {
      if (!guild.channels.cache.some(c => c.parentId === parent.id && c.name === name)) {
        await guild.channels.create({ name, type: ChannelType.GuildText, parent: parent.id, topic: 'VYRA Community' });
      }
    }
  }
  let voiceParent = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === '🔊 SES');
  if (!voiceParent) voiceParent = await guild.channels.create({ name: '🔊 SES', type: ChannelType.GuildCategory });
  for (const name of ['🎧・VYRA Lounge', '🎵・Music Room', '💬・Sohbet', '🔇・AFK']) {
    if (!guild.channels.cache.some(c => c.parentId === voiceParent.id && c.name === name)) await guild.channels.create({ name, type: ChannelType.GuildVoice, parent: voiceParent.id });
  }
  let staffParent = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === '👑 YÖNETİM');
  if (!staffParent) staffParent = await guild.channels.create({ name: '👑 YÖNETİM', type: ChannelType.GuildCategory });
  const moderatorRole = guild.roles.cache.find(r => r.name === '🛡️ Moderator');
  const staffOverwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] }
  ];
  if (moderatorRole) staffOverwrites.push({ id: moderatorRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
  for (const name of ['👑・yönetim', '📋・mod-log', '🚨・rapor-log', '🛠️・geliştirici']) {
    let channel = guild.channels.cache.find(c => c.parentId === staffParent.id && c.name === name);
    if (!channel) {
      channel = await guild.channels.create({ name, type: ChannelType.GuildText, parent: staffParent.id, topic: 'VYRA Staff', permissionOverwrites: staffOverwrites });
    } else {
      await channel.permissionOverwrites.set(staffOverwrites, 'VYRA staff kanallarını gizlilik için güvene al').catch(() => {});
    }
  }
  await community.setup(guild, client.user);
}
function canActOn(interaction, member) {
  if (!member) return false;
  if (member.id === interaction.guild.ownerId) return true;
  const actor = interaction.member;
  return Boolean(actor && actor.roles && actor.roles.highest && member.roles.highest && actor.roles.highest.comparePositionTo(member.roles.highest) > 0);
}
client.once('ready', async () => {
  console.log('VYRA Bot: ' + client.user.tag);
  try { await register(); console.log('Commands registered.'); } catch (e) { console.error('Command registration:', e); }
  await community.checkRelease(client);
  setInterval(() => community.checkRelease(client), 5 * 60 * 1000);
});
client.on('guildMemberAdd', async member => {
  const role = member.guild.roles.cache.find(r => r.name === '💜 VYRA Member');
  if (role) await member.roles.add(role, 'VYRA otomatik üye rolü').catch(() => {});
  const channel = member.guild.channels.cache.find(c => c.name === '👋・hoş-geldin' && c.type === ChannelType.GuildText);
  if (channel) await channel.send({ embeds: [new EmbedBuilder().setColor(0x8d3cff).setTitle('💜 VYRA\'ya hoş geldin!').setDescription(member + ' aramıza katıldı. 🎧')] }).catch(() => {});
  await staffLog(member.guild, '📥 Yeni üye', member.user.tag + ' (' + member.id + ') sunucuya katıldı.', 0x57f287);
});
client.on('guildMemberRemove', member => staffLog(member.guild, '📤 Üye ayrıldı', (member.user ? member.user.tag : member.id) + ' (' + member.id + ') sunucudan ayrıldı.', 0x999999));
client.on('guildBanAdd', ban => staffLog(ban.guild, '🔨 Üye yasaklandı', ban.user.tag + ' (' + ban.user.id + ') yasaklandı.', 0xff5c7a));
client.on('messageDelete', message => {
  if (!message.guild || (message.author && message.author.bot)) return;
  staffLog(message.guild, '🗑️ Mesaj silindi', '**Kanal:** ' + message.channel + '\n**Yazar:** ' + (message.author ? message.author.tag + ' (' + message.author.id + ')' : 'Bilinmiyor') + '\n**İçerik:** ' + (message.content || '[İçerik önbellekte yok]').slice(0, 1500), 0xffa24d);
});
client.on('messageUpdate', (oldMessage, newMessage) => {
  if (!newMessage.guild || (newMessage.author && newMessage.author.bot)) return;
  const before = oldMessage.content, after = newMessage.content;
  if (!before || !after || before === after) return;
  staffLog(newMessage.guild, '✏️ Mesaj düzenlendi', '**Kanal:** ' + newMessage.channel + '\n**Üye:** ' + newMessage.author.tag + '\n**Önce:** ' + before.slice(0, 900) + '\n**Sonra:** ' + after.slice(0, 900), 0xf0b45a);
});
community.attach(client);

// VYRA flood protection: does not require the privileged Message Content intent.
const floodWindows = new Map();
const FLOOD_MAX = Math.max(4, Math.min(20, Number(process.env.AUTOMOD_MAX_MESSAGES || 7)));
const FLOOD_WINDOW_MS = Math.max(3000, Math.min(30000, Number(process.env.AUTOMOD_WINDOW_SECONDS || 8) * 1000));
const FLOOD_TIMEOUT_MS = Math.max(30000, Math.min(3600000, Number(process.env.AUTOMOD_TIMEOUT_MINUTES || 1) * 60000));
client.on('messageCreate', async message => {
  if (!message.guild || message.author.bot || !message.member) return;
  if (message.member.permissions.has(PermissionFlagsBits.Administrator) ||
      message.member.permissions.has(PermissionFlagsBits.ManageMessages) ||
      message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return;
  const key = message.guild.id + ':' + message.author.id;
  const now = Date.now();
  const recent = (floodWindows.get(key) || []).filter(time => now - time < FLOOD_WINDOW_MS);
  recent.push(now);
  floodWindows.set(key, recent);
  if (recent.length < FLOOD_MAX) return;
  floodWindows.delete(key);
  if (!message.member.moderatable) {
    await staffLog(message.guild, '🚨 Flood algılandı', '**Üye:** ' + message.author.tag + '\\n**Kanal:** ' + message.channel + '\\n**Not:** Bot rolü üyeye timeout uygulayamıyor.', 0xff5c7a);
    return;
  }
  try {
    await message.member.timeout(FLOOD_TIMEOUT_MS, 'VYRA otomatik flood koruması');
    if (message.deletable) await message.delete().catch(() => {});
    await staffLog(message.guild, '🛡️ Otomatik flood koruması', '**Üye:** ' + message.author.tag + '\\n**Kanal:** ' + message.channel + '\\n**Mesaj:** ' + FLOOD_MAX + ' mesaj / ' + Math.round(FLOOD_WINDOW_MS / 1000) + ' saniye\\n**Timeout:** ' + Math.round(FLOOD_TIMEOUT_MS / 60000) + ' dakika', 0xff5c7a);
  } catch (error) {
    console.error('VYRA flood protection:', error.message);
  }
});
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const guild = interaction.guild;
  try {
    if (interaction.commandName === 'vyra') return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x8d3cff).setTitle('💜 VYRA').setDescription('Müziği sadece dinleme. Hisset.')] });
    if (interaction.commandName === 'download') return interaction.reply('🎧 VYRA: https://mm2vault.github.io/VYRA-Website/');
    if (interaction.commandName === 'help') return interaction.reply('💜 **VYRA Komutları**\n/vyra • /download • /server • /setup • /report • /clear • /kick • /ban • /warn • /timeout • /untimeout • /slowmode • /suggest • /bug • /level • /profile • /daily • /leaderboard • /poll • /ticket-panel • /announce');
    if (interaction.commandName === 'server') return interaction.reply('📊 ' + guild.name + ' • ' + guild.memberCount + ' üye • ' + guild.channels.cache.size + ' kanal');
    if (interaction.commandName === 'report') {
      const reported = interaction.options.getUser('uye', true);
      const reason = interaction.options.getString('sebep', true);
      if (reported.bot || reported.id === interaction.user.id) return interaction.reply({ content: '❌ Kendini veya bir botu bildiremezsin.', ephemeral: true });
      const channel = guild.channels.cache.find(ch => ch.name === '🚨・rapor-log' && ch.type === ChannelType.GuildText);
      if (!channel) return interaction.reply({ content: '❌ Rapor kanalı bulunamadı. Yönetici /setup çalıştırsın.', ephemeral: true });
      await channel.send({ embeds: [new EmbedBuilder().setColor(0xff5c7a).setTitle('🚨 Yeni üye bildirimi').setDescription('**Bildirilen:** ' + reported.tag + ' (' + reported.id + ')\n**Bildiren:** ' + interaction.user.tag + ' (' + interaction.user.id + ')\n**Sebep:** ' + reason).setTimestamp()] });
      return interaction.reply({ content: '✅ Bildirimin yetkililere iletildi. Teşekkürler.', ephemeral: true });
    }
    if (interaction.commandName === 'setup') {
      await interaction.deferReply({ ephemeral: true });
      await setup(guild);
      return interaction.editReply('✅ VYRA sunucu yapısı kuruldu!');
    }
    if (interaction.commandName === 'clear') {
      const count = interaction.options.getInteger('miktar', true);
      const deleted = await interaction.channel.bulkDelete(count, true);
      await staffLog(guild, '🧹 Mesaj temizlendi', interaction.user.tag + ' #' + interaction.channel.name + ' kanalında ' + deleted.size + ' mesaj sildi.');
      return interaction.reply({ content: '🧹 ' + deleted.size + ' mesaj silindi.', ephemeral: true });
    }
    if (interaction.commandName === 'slowmode') {
      const seconds = interaction.options.getInteger('saniye', true);
      if (!interaction.channel || !interaction.channel.isTextBased() || !('setRateLimitPerUser' in interaction.channel)) return interaction.reply({ content: 'Bu kanalda yavaş mod kullanılamaz.', ephemeral: true });
      await interaction.channel.setRateLimitPerUser(seconds, 'VYRA moderasyonu: ' + interaction.user.tag);
      await staffLog(guild, '🐢 Yavaş mod değişti', interaction.user.tag + ' #' + interaction.channel.name + ' için yavaş modu ' + seconds + ' saniye yaptı.');
      return interaction.reply({ content: seconds ? '🐢 Yavaş mod: ' + seconds + ' saniye.' : '✅ Yavaş mod kapatıldı.', ephemeral: true });
    }
    if (interaction.commandName === 'kick' || interaction.commandName === 'ban' || interaction.commandName === 'warn' || interaction.commandName === 'timeout' || interaction.commandName === 'untimeout') {
      const user = interaction.options.getUser('uye', true);
      const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi.';
      if (user.id === client.user.id) return interaction.reply({ content: 'Bot kendisine bu işlemi uygulayamaz.', ephemeral: true });
      const member = await guild.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.reply({ content: 'Üye sunucuda bulunamadı.', ephemeral: true });
      if (user.id === interaction.user.id) return interaction.reply({ content: 'Bu işlemi kendine uygulayamazsın.', ephemeral: true });
      if (!canActOn(interaction, member)) return interaction.reply({ content: 'Rol hiyerarşisi nedeniyle bu üyeye işlem uygulayamazsın. Senin rolün hedef üyeden yukarıda olmalı.', ephemeral: true });
      if (!member.manageable && ['kick', 'ban', 'timeout', 'untimeout'].includes(interaction.commandName)) return interaction.reply({ content: 'Botun rolü bu üyeden yukarıda değil veya gerekli izni yok.', ephemeral: true });
      if (interaction.commandName === 'kick') await member.kick(reason + ' | Yetkili: ' + interaction.user.tag);
      if (interaction.commandName === 'ban') await guild.members.ban(user.id, { reason: reason + ' | Yetkili: ' + interaction.user.tag });
      if (interaction.commandName === 'warn') {
        await staffLog(guild, '⚠️ Üye uyarıldı', '**Üye:** ' + user.tag + ' (' + user.id + ')\n**Yetkili:** ' + interaction.user.tag + '\n**Sebep:** ' + reason, 0xf0b45a);
        return interaction.reply({ content: '⚠️ ' + user.tag + ' için uyarı kaydı oluşturuldu. Sebep: ' + reason, ephemeral: true });
      }
      if (interaction.commandName === 'timeout') {
        const minutes = interaction.options.getInteger('dakika', true);
        await member.timeout(minutes * 60 * 1000, reason + ' | Yetkili: ' + interaction.user.tag);
        await staffLog(guild, '⏳ Üyeye timeout verildi', '**Üye:** ' + user.tag + '\n**Süre:** ' + minutes + ' dakika\n**Yetkili:** ' + interaction.user.tag + '\n**Sebep:** ' + reason, 0xffa24d);
        return interaction.reply({ content: '⏳ ' + user.tag + ' ' + minutes + ' dakika susturuldu.', ephemeral: true });
      }
      if (interaction.commandName === 'untimeout') {
        await member.timeout(null, reason + ' | Yetkili: ' + interaction.user.tag);
        await staffLog(guild, '🔊 Timeout kaldırıldı', '**Üye:** ' + user.tag + '\n**Yetkili:** ' + interaction.user.tag + '\n**Sebep:** ' + reason, 0x57f287);
        return interaction.reply({ content: '🔊 ' + user.tag + ' üyesinin susturması kaldırıldı.', ephemeral: true });
      }
      await staffLog(guild, interaction.commandName === 'kick' ? '👢 Üye atıldı' : '🔨 Üye yasaklandı', '**Üye:** ' + user.tag + ' (' + user.id + ')\n**Yetkili:** ' + interaction.user.tag + '\n**Sebep:** ' + reason, 0xff5c7a);
      return interaction.reply({ content: (interaction.commandName === 'kick' ? '👢 ' : '🔨 ') + user.tag + (interaction.commandName === 'kick' ? ' sunucudan atıldı.' : ' yasaklandı.'), ephemeral: true });
    }
  } catch (error) {
    console.error('Command error:', error);
    const reply = { content: '❌ İşlem tamamlanamadı. Bot izinlerini, rol sıralamasını ve kanal ayarlarını kontrol et.', ephemeral: true };
    if (interaction.deferred) return interaction.editReply(reply).catch(() => {});
    if (interaction.replied) return interaction.followUp(reply).catch(() => {});
    return interaction.reply(reply).catch(() => {});
  }
});
require('./dashboard').start(client);
client.login(token);
