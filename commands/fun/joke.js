const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('joke')
        .setDescription('Get a random joke')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of joke')
                .setRequired(false)
                .addChoices(
                    { name: 'General', value: 'general' },
                    { name: 'Dad Jokes', value: 'dad' },
                    { name: 'Programming', value: 'programming' },
                    { name: 'Malayalam', value: 'malayalam' }
                )),
    
    cooldown: 3,
    
    async execute(interaction) {
        const type = interaction.options.getString('type') || 'general';
        
        let joke;
        
        switch (type) {
            case 'dad':
                joke = getDadJoke();
                break;
            case 'programming':
                joke = getProgrammingJoke();
                break;
            case 'malayalam':
                joke = getMalayalamJoke();
                break;
            default:
                joke = getGeneralJoke();
        }
        
        const jokeEmbed = new EmbedBuilder()
            .setColor('#ffff00')
            .setTitle('😂 Here\'s a joke for you!')
            .setDescription(joke)
            .setFooter({ 
                text: `Requested by ${interaction.user.tag} • Mallu Club`, 
                iconURL: interaction.user.displayAvatarURL() 
            })
            .setTimestamp();
        
        await interaction.reply({ embeds: [jokeEmbed] });
    },
};

function getGeneralJoke() {
    const jokes = [
        "Why don't scientists trust atoms? Because they make up everything!",
        "I told my wife she was drawing her eyebrows too high. She looked surprised.",
        "Why don't eggs tell jokes? They'd crack each other up!",
        "What do you call a fake noodle? An impasta!",
        "Why did the scarecrow win an award? He was outstanding in his field!",
        "What's the best thing about Switzerland? I don't know, but the flag is a big plus.",
        "Why don't oysters share? Because they're shellfish!",
        "What do you call a bear with no teeth? A gummy bear!",
        "Why did the math book look so sad? Because it had too many problems!",
        "What do you call a sleeping bull? A bulldozer!"
    ];
    
    return jokes[Math.floor(Math.random() * jokes.length)];
}

function getDadJoke() {
    const jokes = [
        "I'm reading a book about anti-gravity. It's impossible to put down!",
        "Why don't scientists trust atoms? Because they make up everything!",
        "I would avoid the sushi if I were you. It's a little fishy.",
        "Want to hear a joke about construction? I'm still working on it.",
        "What did the ocean say to the beach? Nothing, it just waved.",
        "Why do fathers take an extra pair of socks when they go golfing? In case they get a hole in one!",
        "Singing in the shower is fun until you get soap in your mouth. Then it's a soap opera.",
        "What do you call a factory that makes okay products? A satisfactory!",
        "Dear Math, grow up and solve your own problems.",
        "I only know 25 letters of the alphabet. I don't know y."
    ];
    
    return jokes[Math.floor(Math.random() * jokes.length)];
}

function getProgrammingJoke() {
    const jokes = [
        "Why do programmers prefer dark mode? Because light attracts bugs!",
        "How many programmers does it take to change a light bulb? None, that's a hardware problem!",
        "Why do Java developers wear glasses? Because they can't C#!",
        "There are only 10 types of people in the world: those who understand binary and those who don't.",
        "99 little bugs in the code, 99 little bugs. Take one down, patch it around, 117 little bugs in the code.",
        "A SQL query goes into a bar, walks up to two tables and asks: 'Can I join you?'",
        "Why did the programmer quit his job? Because he didn't get arrays!",
        "What's the object-oriented way to become wealthy? Inheritance.",
        "Why do programmers always mix up Halloween and Christmas? Because Oct 31 equals Dec 25!",
        "A programmer is told to 'go to hell.' He finds the worst part of that statement is the 'go to.'"
    ];
    
    return jokes[Math.floor(Math.random() * jokes.length)];
}

function getMalayalamJoke() {
    const jokes = [
        "എന്താണ് ആനയുടെ ടൂത്ത് പേസ്റ്റ്? കോൾഗേറ്റ് ജംബോ! 😄",
        "ഡോക്ടർ: നിങ്ങൾക്ക് ഓർമ്മശക്തി കുറവാണ്. രോഗി: എന്ത് പറഞ്ഞു? ഡോക്ടർ: എന്താണ് പറഞ്ഞത്? 😅",
        "ബീഫ് കഴിക്കാൻ പറ്റാത്ത പശു എന്താണ്? വെജിറ്റേറിയൻ പശു! 🐄",
        "കണ്ണടയുടെ ദുഃഖം എന്താണ്? എപ്പോഴും മൂക്കിൽ തൂങ്ങിക്കിടക്കണം! 👓",
        "ചായ കുടിക്കാൻ പറ്റാത്ത ചായ എന്താണ്? കഫേ! ☕",
        "ഏറ്റവും നല്ല പഞ്ചസാര എന്താണ്? സുഗന്ധവാളി! 🍯",
        "കേരളത്തിലെ ഏറ്റവും വേഗം പോകുന്ന ബസ് എന്താണ്? എക്സ്പ്രസ് ബസ്! 🚌",
        "ഏറ്റവും സൗജന്യമായ വാഹനം എന്താണ്? കാലുകൾ! 🚶",
        "കുക്കിംഗ് ഗ്യാസ് ഇല്ലാത്ത അടുക്കള എന്താണ്? ഓൾഡ് ഫാഷൻ! 🔥",
        "ഏറ്റവും നല്ല പാചകക്കാരൻ ആരാണ്? വീട്ടിലെ അമ്മ! 👩‍🍳"
    ];
    
    return jokes[Math.floor(Math.random() * jokes.length)];
}
