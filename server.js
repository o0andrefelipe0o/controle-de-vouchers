// Importa os módulos necessários
const express = require('express'); // Framework para criar o servidor web
const app = express(); // Cria uma instância da aplicação Express
const cors = require('cors'); // Middleware para habilitar CORS (Cross-Origin Resource Sharing)
const bodyParser = require('body-parser'); // Middleware para parsing do corpo das requisições
const fs = require('fs'); // Módulo para manipulação de arquivos no sistema
const moment = require('moment'); // Biblioteca para manipulação e formatação de datas e horas
const serverStartTime = Date.now(); // Armazena o tempo de início do servidor

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
        fs.writeFileSync(filePath, 'Permitir "Retirar novo": NÃO\nTempo: 00:00:00\nQuantidade: 0\nVouchers:\n00000-00000\n', 'utf-8');
        console.log("Criado arquivo vouchers.txt com valores padrão.");
    } else {
        // Se o arquivo existir, verifica se está vazio
        const fileContent = fs.readFileSync(filePath, 'utf-8').trim();
        if (fileContent === '') {
            // Se o conteúdo estiver vazio, escreve os valores padrão
            fs.writeFileSync(filePath, 'Permitir "Retirar novo": NÃO\nTempo: 00:00:00\nQuantidade: 0\nVouchers:\n00000-00000\n', 'utf-8');
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
        fs.writeFileSync(filePath, 'Permitir "Retirar novo": NÃO\nTempo: 00:00:00\nQuantidade: 0\nVouchers:\n', 'utf-8');
    }
    
    // Lê o arquivo e separa o conteúdo por linhas
    const data = fs.readFileSync('vouchers.txt', 'utf-8'); 
    const lines = data.split('\n').map(line => line.trim()).filter(line => line !== ''); // Remove linhas vazias e espaços extras

    // Obtém os valores do arquivo
	let allowNewButton = lines[0].replace('Permitir "Retirar novo": ', ''); // Obtém SIM ou NÃO para permissão do botão 'Retirar Novo' se vai ou não funcionar
    const validity = lines[1].replace('Tempo: ', ''); // Obtém o tempo de validade do voucher
    const quantity = parseInt(lines[2].replace('Quantidade: ', '')); // Obtém a quantidade de vouchers disponíveis
    const vouchers = lines.slice(3).filter(line => line.startsWith('Vouchers:') === false); // Lista de vouchers disponíveis

    if (validity === "00:00:00" && allowNewButton === "NÃO") {
        allowNewButton = "SIM"
    }

    return {
		allowNewButton,
        validity,
        quantity,
        vouchers
    };
}

// Função para salvar os vouchers no arquivo 'vouchers.txt'
function saveVouchersToFile(allowNewButton, validity, quantity, vouchers) {
    const updatedQuantity = vouchers.filter(v => v.trim() !== '').length; // Conta os vouchers não vazios

    /*
    // Se não houver mais vouchers, define a validade como 00:00:00
    let newValidity = validity;
    if (quantity === 0) {
        newValidity = '00:00:00';
    }
    */

    // Formata os dados e reescreve o arquivo 'vouchers.txt'
    const data = `Permitir "Retirar novo": ${allowNewButton}\nTempo: ${validity}\nQuantidade: ${updatedQuantity}\nVouchers:\n${vouchers.join('\n')}`;
    //const data = `Permitir "Retirar novo": ${allowNewButton}\nTempo: ${newValidity}\nQuantidade: ${quantity}\nVouchers:\n${vouchers.join('\n')}`;
    fs.writeFileSync('vouchers.txt', data, 'utf-8');
}

/* Função para formatar tempo restante */
/*
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
}
*/

// Variáveis para armazenar o voucher ativo e o tempo de expiração
let activeVoucher = null; // Variável para armazenar o voucher ativo
let voucherTime = null; // Variável para armazenar o tempo de expiração do voucher
let voucherValidity = null; // Variável para armazenar a validade do voucher
let lastVoucher = null; // Armazena o último voucher utilizado

// Rota para monitorar se o servidor está online e detectar reinicializações.
app.get('/healthCheck', (req, res) => {
    res.send(serverStartTime.toString()); // Retorna o tempo de início do servidor
});
/*
// Rota para armazenar o ultimo voucher inativo
app.get('/getLastVoucher', (req, res) => {
    if (lastVoucher) {
        return res.json({
            message: "", // Mensagem mostrando voucher anteriormente ativo
			voucher: lastVoucher.voucher, // Voucher
			expiresAt: lastVoucher.expiresAt, // Hora de expiração do voucher
			timeLeft: lastVoucher.timeLeft, // Tempo restante para expiração
			quantity: lastVoucher.quantity, // Quantidade de vouchers restantes
			validity: lastVoucher.validity // Validade do voucher
        });
    }
});
*/

// Rota para exibir ultimo voucher ativo
app.get('/getVoucherInformation', (req, res) => {
    const { allowNewButton, validity, quantity, vouchers } = readVouchersFile(); // Lê os dados do arquivo
	
	// Verifica se o voucher expirou antes de continuar
    if (activeVoucher !== null && moment().isAfter(voucherTime)) {
        // Calcula o tempo restante até a expiração
		let timeLeft = moment(voucherTime).diff(moment(), 'seconds'); // Calcula o tempo restante
		let hours = Math.floor(timeLeft / 3600); // Hora restante
		let minutes = Math.floor((timeLeft % 3600) / 60); // Minutos restantes
		let seconds = timeLeft % 60; // Segundos restantes
        
        // Salva o último voucher utilizado antes de limpar
        lastVoucher = {
            allowNewButton, // Retorna permissão para usar 'Retirar novo'
            message: "", // Mensagem mostrando voucher anteriormente ativo
			voucher: activeVoucher, // Voucher
			expiresAt: voucherTime.format('DD/MM/YYYY [às] HH:mm:ss'), // Hora de expiração do voucher
			timeLeft: `${hours}h ${minutes}m ${seconds}s`, // Tempo restante para expiração
			quantity: quantity, // Quantidade de vouchers restantes
			validity: validity // Validade do voucher
        };

        // Se o voucher expirou, limpa o voucher ativo e o tempo de expiração
        activeVoucher = null;
        voucherTime = null;
    }
	
	// Se tiver voucher ativo
	if (activeVoucher !== null && voucherTime !== null) {
		// Calcula o tempo restante até a expiração
		let timeLeft = moment(voucherTime).diff(moment(), 'seconds'); // Calcula o tempo restante
		let hours = Math.floor(timeLeft / 3600); // Hora restante
		let minutes = Math.floor((timeLeft % 3600) / 60); // Minutos restantes
		let seconds = timeLeft % 60; // Segundos restantes
		
		return res.json({
            allowNewButton, // Retorna permissão para usar 'Retirar novo'
			message: "", // Mensagem mostrando voucher anteriormente ativo
			voucher: activeVoucher, // Voucher
			expiresAt: voucherTime.format('DD/MM/YYYY [às] HH:mm:ss'), // Hora de expiração do voucher
			timeLeft: `${hours}h ${minutes}m ${seconds}s`, // Tempo restante para expiração
			quantity: quantity, // Quantidade de vouchers restantes
			validity: validity // Validade do voucher
		});
	} else {
        // Se tiver voucher expirado
        if (lastVoucher) {
            return res.json({
                allowNewButton, // Retorna permissão para usar 'Retirar novo'
                message: "", // Mensagem mostrando voucher anteriormente ativo
                voucher: lastVoucher.voucher, // Voucher
                expiresAt: lastVoucher.expiresAt, // Hora de expiração do voucher
                timeLeft: "Expirado", // Tempo restante para expiração
                quantity: lastVoucher.quantity, // Quantidade de vouchers restantes
                validity: lastVoucher.validity // Validade do voucher
            });
        }
    }
});

app.get('/askGetVoucher', (req, res) => {
    //if (activeVoucher === null || !lastVoucher) primeiro click = ativa
    //if ((activeVoucher !== null || lastVoucher) && allowNewButton !== "NÃO") se pede confirmação (ok = ativa, não ok = não ativa), se não = ativa
    const { allowNewButton, quantity, vouchers } = readVouchersFile(); // Lê os dados do arquivo

    // Verifica se há um voucher ativo e ainda válido
    if (activeVoucher && moment().isBefore(voucherTime)) {
        return res.json({
            requireConfirmation: allowNewButton !== "NÃO" && quantity > 0 ? true : false
        });
    }

    // Se um último voucher já existiu, ainda deve pedir confirmação
    if (lastVoucher) {
        return res.json({
            requireConfirmation: allowNewButton !== "NÃO" && quantity > 0 ? true : false
        });
    }

    // Se há vouchers disponíveis, entrega um novo
    if (vouchers.length > 0) {
        return res.json({
            requireConfirmation: false
        });
    } else {
        return res.json({
            requireConfirmation: false
        });
    }
});

// Rota para retirar e exibir um voucher, iniciada ao pressionar o botão para retirar voucher
app.get('/getVoucher', (req, res) => {
    const { allowNewButton, validity, quantity, vouchers } = readVouchersFile(); // Lê os dados do arquivo
    
	// Verifica se o voucher expirou antes de continuar
    if (activeVoucher !== null && moment().isAfter(voucherTime)) {
        // Calcula o tempo restante até a expiração
		let timeLeft = moment(voucherTime).diff(moment(), 'seconds'); // Calcula o tempo restante
		let hours = Math.floor(timeLeft / 3600); // Hora restante
		let minutes = Math.floor((timeLeft % 3600) / 60); // Minutos restantes
		let seconds = timeLeft % 60; // Segundos restantes
        
        // Salva o último voucher utilizado antes de limpar
        lastVoucher = {
            message: "", // Mensagem mostrando voucher anteriormente ativo
			voucher: activeVoucher, // Voucher
			expiresAt: voucherTime.format('DD/MM/YYYY [às] HH:mm:ss'), // Hora de expiração do voucher
			timeLeft: `${hours}h ${minutes}m ${seconds}s`, // Tempo restante para expiração
			quantity: quantity, // Quantidade de vouchers restantes
			validity: validity // Validade do voucher
        };

        // Se o voucher expirou, limpa o voucher ativo e o tempo de expiração
        activeVoucher = null;
        voucherTime = null;
    }
	
	// Se a opção de permitir novo voucher for "NÃO" e já existir um voucher ativo que ainda não expirou, retorna um erro depois de apertar o botão
    if (allowNewButton === "NÃO" && activeVoucher && moment().isBefore(voucherTime)) {
		// Calcula o tempo restante até a expiração
		let timeLeft = moment(voucherTime).diff(moment(), 'seconds'); // Calcula o tempo restante
		let hours = Math.floor(timeLeft / 3600); // Hora restante
		let minutes = Math.floor((timeLeft % 3600) / 60); // Minutos restantes
		let seconds = timeLeft % 60; // Segundos restantes

        return res.status(400).json({
            message: quantity > 0 ? "Aguarde o voucher atual expirar!" : "Não há mais voucher disponível!", // Mensagem de erro
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
		
		voucherValidity = validity; // Atualiza a validade do voucher a cada requisição bem sucedida

        const updatedQuantity = vouchers.filter(v => v.trim() !== '').length; // Conta os vouchers não vazios e tualiza os vouchers restantes no arquivo

        saveVouchersToFile(allowNewButton, voucherValidity, updatedQuantity, vouchers);
		
		//if (voucherTime === null) { // Define o tempo de expiração com base na validade apenas se for a primeira vez (não atualiza sempre)
		voucherTime = moment().add(moment.duration(voucherValidity)); // Define o tempo de expiração baseado na validade do voucher
		//}
		
        // Calcula o tempo restante até a expiração
		let timeLeft = moment(voucherTime).diff(moment(), 'seconds'); // Calcula o tempo restante
		let hours = Math.floor(timeLeft / 3600); // Hora restante
		let minutes = Math.floor((timeLeft % 3600) / 60); // Minutos restantes
		let seconds = timeLeft % 60; // Segundos restantes
		
        return res.json({
            message: "Voucher retirado com sucesso!", // Mensagem de sucesso
            voucher: activeVoucher, // Voucher ativado
            expiresAt: voucherTime.format('DD/MM/YYYY [às] HH:mm:ss'), // Hora de expiração do voucher
            timeLeft: `${hours}h ${minutes}m ${seconds}s`, // Tempo restante para expiração
            quantity: updatedQuantity, // Quantidade de vouchers restantes
            validity: validity // Validade do voucher
        });
    } else { // Caso não haja mais vouchers disponíveis antes ou depois de apertar o botão
        
        // message: activeVoucher  ||  lastVoucher ? "Não há mais voucher disponível!" : "Não há voucher disponível!", // Mensagem de erro

        // Calcula o tempo restante até a expiração
		let timeLeft = moment(voucherTime).diff(moment(), 'seconds'); // Calcula o tempo restante
		let hours = Math.floor(timeLeft / 3600); // Hora restante
		let minutes = Math.floor((timeLeft % 3600) / 60); // Minutos restantes
		let seconds = timeLeft % 60; // Segundos restantes
        
        if (activeVoucher || lastVoucher) {
            res.status(400).json({
                message: "Não há mais voucher disponível!", // Mensagem de erro
                voucher: activeVoucher ? activeVoucher : lastVoucher.voucher, // Voucher ativo ou último voucher
                expiresAt: activeVoucher ? voucherTime.format('DD/MM/YYYY [às] HH:mm:ss') : lastVoucher.expiresAt, // Data de expiração
                timeLeft: activeVoucher ? `${hours}h ${minutes}m ${seconds}s` : "Expirado", // Tempo restante ou expirado
                quantity: activeVoucher ? quantity : lastVoucher.quantity, // Quantidade de vouchers restantes
                validity: activeVoucher ? validity : lastVoucher.validity // Validade do voucher
            });
        } else {
            res.status(400).json({
                message: "Não há voucher disponível!", // Mensagem de erro
                voucher: "", // Voucher
                expiresAt: "", // Hora de expiração do voucher
                timeLeft: "", // Tempo restante para expiração
                quantity: "", // Quantidade de vouchers restantes
                validity: "" // Validade do voucher
            });
        }
    }
});
/*
// Inicia o servidor na porta 3000
initializeVouchersFile(); // Inicializa o arquivo de vouchers, se necessário
require('dotenv').config();
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`); // Exibe mensagem no console quando o servidor está ativo
});
*/
initializeVouchersFile(); // Inicializa o arquivo de vouchers, se necessário
require('dotenv').config();
const path = require('path');
const PORT = process.env.PORT || 3000;

// Servir arquivos estáticos (como index.html, CSS, JS etc.)
app.use(express.static(path.join(__dirname)));

// Rota padrão (opcional se estiver usando arquivos estáticos)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

// npm install dotenv
