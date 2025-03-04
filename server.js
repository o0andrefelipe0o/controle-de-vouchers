// Importa os módulos necessários
const express = require('express'); // Framework para criar o servidor web
const app = express(); // Cria uma instância da aplicação Express
const cors = require('cors'); // Middleware para habilitar CORS (Cross-Origin Resource Sharing)
const bodyParser = require('body-parser'); // Middleware para parsing do corpo das requisições
const fs = require('fs'); // Módulo para manipulação de arquivos no sistema
const moment = require('moment'); // Biblioteca para manipulação e formatação de datas e horas

// Middleware para permitir requisições de outras origens
app.use(cors()); // Permite que a API seja acessada por outras origens
// Middleware para interpretar JSON no corpo das requisições
app.use(bodyParser.json()); // Converte o corpo das requisições em formato JSON para fácil acesso

// Função para criar um arquivo vouchers.txt com valores iniciais
function initializeVouchersFile() {
    const filePath = 'vouchers.txt'; // Caminho do arquivo

    // Verifica se o arquivo 'vouchers.txt' existe
    if (!fs.existsSync(filePath)) {
        // Se não existir, cria com o conteúdo inicial
        fs.writeFileSync(filePath, 'Tempo: 00:00:00\nQuantidade: 0\nVouchers:\n00000-00000\n', 'utf-8');
        console.log("Arquivo vouchers.txt criado com valores padrão.");
    } else {
        // Se o arquivo existir, verifica se está vazio
        const fileContent = fs.readFileSync(filePath, 'utf-8').trim();
        if (fileContent === '') {
            // Se o conteúdo estiver vazio, escreve os valores padrão
            fs.writeFileSync(filePath, 'Tempo: 00:00:00\nQuantidade: 0\nVouchers:\n00000-00000\n', 'utf-8');
            console.log("Arquivo vouchers.txt estava vazio e foi atualizado com valores padrão.");
        }
    }
}

// Função para ler o arquivo 'vouchers.txt' e extrair os dados
function readVouchersFile() {
    const filePath = 'vouchers.txt'; // Caminho do arquivo
    // Garante que 'vouchers.txt' não esteja vazio
    if (!fs.existsSync(filePath) || fs.readFileSync(filePath, 'utf-8').trim() === '') {
        console.log("Arquivo vouchers.txt estava vazio. Preenchendo com valores padrão.");
        fs.writeFileSync(filePath, 'Tempo: 00:00:00\nQuantidade: 0\nVouchers:\n', 'utf-8');
    }
    
    // Lê o arquivo e separa o conteúdo por linhas
    const data = fs.readFileSync('vouchers.txt', 'utf-8'); 
    const lines = data.split('\n').map(line => line.trim()).filter(line => line !== ''); // Remove linhas vazias e espaços extras

    // Obtém os valores do arquivo
    const validity = lines[0].replace('Tempo: ', ''); // Obtém o tempo de validade do voucher
    const quantity = parseInt(lines[1].replace('Quantidade: ', '')); // Obtém a quantidade de vouchers disponíveis
    const vouchers = lines.slice(2).filter(line => line.startsWith('Vouchers:') === false); // Lista de vouchers disponíveis

    return {
        validity,
        quantity,
        vouchers
    };
}

// Função para salvar os vouchers no arquivo 'vouchers.txt'
function saveVouchersToFile(validity, vouchers) {
    const quantity = vouchers.filter(v => v.trim() !== '').length; // Conta os vouchers não vazios

    // Se não houver mais vouchers, define a validade como 00:00:00
    let newValidity = validity;
    if (quantity === 0) {
        newValidity = '00:00:00';
    }

    // Formata os dados e reescreve o arquivo 'vouchers.txt'
    const data = `Tempo: ${newValidity}\nQuantidade: ${quantity}\nVouchers:\n${vouchers.join('\n')}`;
    fs.writeFileSync('vouchers.txt', data, 'utf-8');
}

// Variáveis para armazenar o voucher ativo e o tempo de expiração
let activeVoucher = null; // Variável para armazenar o voucher ativo
let voucherTime = null; // Variável para armazenar o tempo de expiração do voucher
let voucherValidity = null; // Variável para armazenar a validade do voucher

// Rota para obter um voucher, iniciada ao pressionar o botão para pedir voucher
app.get('/getVoucher', (req, res) => {
    const { validity, quantity, vouchers } = readVouchersFile(); // Lê os dados do arquivo

    // Define a validade do voucher caso ainda não tenha sido atribuída
    if (!voucherValidity) {
        voucherValidity = validity;
    }

    // Se já existe um voucher ativo e ainda não expirou, retorna um erro depois de apertar o botão
    if (activeVoucher && moment().isBefore(voucherTime)) {
        let timeLeft = moment(voucherTime).diff(moment(), 'seconds'); // Calcula o tempo restante
        let hours = Math.floor(timeLeft / 3600); // Hora restante
        let minutes = Math.floor((timeLeft % 3600) / 60); // Minutos restantes
        let seconds = timeLeft % 60; // Segundos restantes

        return res.status(400).json({
            message: "Ainda há um voucher ativo!", // Mensagem de erro
            voucher: activeVoucher, // Voucher ativo
            expiresAt: voucherTime.format('DD/MM/YYYY [às] HH:mm:ss'), // Hora de expiração do voucher
            timeLeft: `${hours}h ${minutes}m ${seconds}s`, // Tempo restante para expiração
            quantity: quantity, // Quantidade de vouchers restantes
            validity: validity // Validade do voucher
        });
    }

    // Se há vouchers disponíveis, entrega um novo depois de apertar o botão
    if (vouchers.length > 0) {
        activeVoucher = vouchers.pop(); // Retira o último voucher disponível
        voucherTime = moment().add(moment.duration(voucherValidity)); // Define o tempo de expiração

        // Atualiza os vouchers restantes no arquivo
        const updatedQuantity = vouchers.length;
        saveVouchersToFile(voucherValidity, vouchers);

        // Calcula o tempo restante até a expiração
        let totalSeconds = moment(voucherTime).diff(moment(), 'seconds');
        let hours = Math.floor(totalSeconds / 3600); // Hora restante
        let minutes = Math.floor((totalSeconds % 3600) / 60); // Minutos restantes
        let seconds = totalSeconds % 60; // Segundos restantes

        return res.json({
            message: "Voucher ativado com sucesso!", // Mensagem de sucesso
            voucher: activeVoucher, // Voucher ativado
            expiresAt: voucherTime.format('DD/MM/YYYY [às] HH:mm:ss'), // Hora de expiração do voucher
            timeLeft: `${hours}h ${minutes}m ${seconds}s`, // Tempo restante para expiração
            quantity: updatedQuantity, // Quantidade de vouchers restantes
            validity: validity // Validade do voucher
        });
    }

    // Caso não haja mais vouchers disponíveis antes ou depois de apertar o botão
    res.status(400).json({
        message: "Não há voucher disponível!", // Mensagem de erro
        expiresAt: "Não disponível", // Expiração não disponível
        timeLeft: "Não disponível", // Tempo restante não disponível
        quantity: quantity, // Quantidade de vouchers restantes
        validity: validity // Validade do voucher
    });
});

// Inicia o servidor na porta 3000
initializeVouchersFile(); // Inicializa o arquivo de vouchers, se necessário
require('dotenv').config();
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`); // Exibe mensagem no console quando o servidor está ativo
});
