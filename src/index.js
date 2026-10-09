require('dotenv').config();
const {Client,GatewayIntentBits,REST,Routes,SlashCommandBuilder,PermissionFlagsBits,ChannelType,EmbedBuilder}=require('discord.js');
const community=require('./community');
const token=process.env.DISCORD_TOKEN,clientId=process.env.CLIENT_ID,guildId=process.env.GUILD_ID;
if(!token||!clientId||!guildId){console.error('Missing environment variables.');process.exit(1);}
const commands=[
new SlashCommandBuilder().setName('vyra').setDescription('VYRA hakkında bilgi.'),
new SlashCommandBuilder().setName('download').setDescription('VYRA indirme bağlantısı.'),
new SlashCommandBuilder().setName('help').setDescription('Bot komutları.'),
new SlashCommandBuilder().setName('server').setDescription('Sunucu bilgileri.'),
new SlashCommandBuilder().setName('setup').setDescription('VYRA sunucu yapısını kurar.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
new SlashCommandBuilder().setName('clear').setDescription('Mesajları siler.').addIntegerOption(o=>o.setName('miktar').setDescription('1-100').setMinValue(1).setMaxValue(100).setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
new SlashCommandBuilder().setName('kick').setDescription('Üyeyi atar.').addUserOption(o=>o.setName('üye').setDescription('Üye').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
new SlashCommandBuilder().setName('ban').setDescription('Üyeyi yasaklar.').addUserOption(o=>o.setName('üye').setDescription('Üye').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
...community.commands
].map(c=>typeof c.toJSON==='function'?c.toJSON():c);
const client=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMembers,GatewayIntentBits.GuildMessages]});
async function register(){const rest=new REST({version:'10'}).setToken(token);await rest.put(Routes.applicationGuildCommands(clientId,guildId),{body:commands});}
async function category(guild,name){return guild.channels.cache.find(c=>c.type===ChannelType.GuildCategory&&c.name===name)||guild.channels.create({name,type:ChannelType.GuildCategory});}
async function text(guild,parent,name,topic){return guild.channels.cache.find(c=>c.parentId===parent.id&&c.name===name)||guild.channels.create({name,type:ChannelType.GuildText,parent:parent.id,topic});}
async function voice(guild,parent,name){return guild.channels.cache.find(c=>c.parentId===parent.id&&c.name===name)||guild.channels.create({name,type:ChannelType.GuildVoice,parent:parent.id});}
async function setup(guild){
const roles=[['💜 VYRA Member',0x8d3cff],['⭐ Early Supporter',0xf09bff],['🎵 Music Lover',0xbd67ff],['🔧 Developer',0x5865f2],['🛡️ Moderator',0x57f287]];
for(const r of roles)if(!guild.roles.cache.some(x=>x.name===r[0]))await guild.roles.create({name:r[0],color:r[1]});
const groups=[['📌 BAŞLANGIÇ',['👋・hoş-geldin','📜・kurallar','📢・duyurular','📰・güncellemeler','🔗・bağlantılar']],['🎧 VYRA',['💜・vyra','📱・uygulama','⬇️・indirme','✨・özellikler','💡・öneriler']],['💬 TOPLULUK',['💬・sohbet','🎵・müzik-sohbeti','🎶・şarkı-önerileri','📸・paylaşımlar']],['🛠️ DESTEK',['❓・yardım','🐛・hata-bildirim','📩・geri-bildirim']]];
for(const g of groups){const c=await category(guild,g[0]);for(const n of g[1])await text(guild,c,n,'VYRA Community');}
const v=await category(guild,'🔊 SES');for(const n of ['🎧・VYRA Lounge','🎵・Music Room','💬・Sohbet','🔇・AFK'])await voice(guild,v,n);
const s=await category(guild,'👑 YÖNETİM');for(const n of ['👑・yönetim','📋・mod-log','🚨・rapor-log','🛠️・geliştirici'])await text(guild,s,n,'VYRA Staff');
await community.setup(guild, client.user);
return true;}
community.attach(client);
client.once('ready',async()=>{console.log('VYRA Bot: '+client.user.tag);try{await register();console.log('Commands registered.')}catch(e){console.error(e)};await community.checkRelease(client);setInterval(()=>community.checkRelease(client),5*60*1000);});
client.on('guildMemberAdd',async member=>{const role=member.guild.roles.cache.find(r=>r.name==='💜 VYRA Member');if(role)await member.roles.add(role,'VYRA otomatik üye rolü').catch(()=>{});const ch=member.guild.channels.cache.find(c=>c.name==='👋・hoş-geldin');if(!ch)return;const e=new EmbedBuilder().setColor(0x8d3cff).setTitle('💜 VYRA\'ya hoş geldin!').setDescription(member+' aramıza katıldı. 🎧');ch.send({embeds:[e]}).catch(()=>{});});
client.on('interactionCreate',async i=>{if(!i.isChatInputCommand())return;const g=i.guild;
if(i.commandName==='vyra')return i.reply({embeds:[new EmbedBuilder().setColor(0x8d3cff).setTitle('💜 VYRA').setDescription('Müziği sadece dinleme. Hisset.')]});
if(i.commandName==='download')return i.reply('🎧 VYRA: https://mm2vault.github.io/VYRA-Website/');
if(i.commandName==='help')return i.reply('💜 /vyra  /download  /server  /setup  /clear  /kick  /ban  /suggest  /bug  /level  /leaderboard  /ticket-panel  /announce');
if(i.commandName==='server')return i.reply('📊 '+g.name+' • '+g.memberCount+' üye • '+g.channels.cache.size+' kanal');
if(i.commandName==='setup'){await i.deferReply({ephemeral:true});try{await setup(g);return i.editReply('✅ VYRA sunucu yapısı kuruldu!')}catch(e){console.error(e);return i.editReply('❌ Kurulum hatası.')}}
if(i.commandName==='clear'){const n=i.options.getInteger('miktar');await i.deferReply({ephemeral:true});const m=await i.channel.bulkDelete(n,true);return i.editReply('🧹 '+m.size+' mesaj silindi.');}
if(i.commandName==='kick'){const u=i.options.getUser('üye'),m=await g.members.fetch(u.id).catch(()=>null);if(!m)return i.reply({content:'Üye bulunamadı.',ephemeral:true});await m.kick();return i.reply('👢 '+u.tag+' atıldı.');}
if(i.commandName==='ban'){const u=i.options.getUser('üye');await g.members.ban(u.id);return i.reply('🔨 '+u.tag+' yasaklandı.');}
});
client.login(token);