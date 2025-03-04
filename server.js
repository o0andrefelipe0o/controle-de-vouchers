const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const moment = require('moment');

app.use(cors());
app.use(bodyParser.json());

// Função para ler o arquivo 'vouchers.txt'
function readVouchersFile() {
    const data = fs.readFileSync('vouchers.txt', 'utf-8');
    const lines = data.split('\n').map(line => line.trim()).filter(line => line !== '');

    const validity = lines[0].replace('Tempo: ', '');  // Tempo de validade do voucher (primeira linha)
    const quantity = parseInt(lines[1].replace('Quantidade: ', ''));  // Quantidade de vouchers (segunda linha)
    const vouchers = lines.slice(2).filter(line => line.startsWith('Vouchers:') === false);  // Vouchers (linhas subsequentes)

    return {
        validity,
        quantity,
        vouchers
    };
}

// Função para salvar os vouchers no arquivo 'vouchers.txt'
function saveVouchersToFile(validity, vouchers) {
    // Primeiro, conta os vouchers reais
    const quantity = vouchers.filter(v => v.trim() !== '').length;

    // Apenas zera o tempo se a quantidade for realmente zero
    const newValidity = quantity === 0 ? '00:00:00' : validity;

    const data = `Tempo: ${newValidity}\nQuantidade: ${quantity}\nVouchers:\n${vouchers.join('\n')}`;
    fs.writeFileSync('vouchers.txt', data, 'utf-8');
}

let activeVoucher = null;
let voucherTime = null;
let voucherValidity = null;

app.get('/getVoucher', (req, res) => {
    const { validity, quantity, vouchers } = readVouchersFile();

    if (!voucherValidity) {
        voucherValidity = validity;  // Define o tempo de validade global para o primeiro uso
    }

    if (activeVoucher && moment().isBefore(voucherTime)) {
        let timeLeft = moment(voucherTime).diff(moment(), 'seconds');
        let hours = Math.floor(timeLeft / 3600);
        let minutes = Math.floor((timeLeft % 3600) / 60);
        let seconds = timeLeft % 60;

        // Cálculo do tempo restante
        return res.status(400).json({
            message: "Você ainda tem um voucher ativo!",
            voucher: activeVoucher,
            expiresAt: voucherTime.format('DD/MM/YYYY [às] HH:mm:ss'),
            timeLeft: `${hours}h ${minutes}m ${seconds}s`,
            quantity: quantity, // Quantidade de vouchers disponível
            validity: validity // Tempo de validade
        });
    }

    if (vouchers.length > 0) {
        activeVoucher = vouchers.pop();
        voucherTime = moment().add(moment.duration(voucherValidity));
        
        // Atualiza a quantidade de vouchers restantes
        const updatedQuantity = vouchers.length;
        saveVouchersToFile(voucherValidity, vouchers);

        // Cálculo do tempo restante
        let totalSeconds = moment(voucherTime).diff(moment(), 'seconds');
        let hours = Math.floor(totalSeconds / 3600);
        let minutes = Math.floor((totalSeconds % 3600) / 60);
        let seconds = totalSeconds % 60;

        return res.json({
            message: "Voucher ativado com sucesso!",
            voucher: activeVoucher,
            expiresAt: voucherTime.format('DD/MM/YYYY [às] HH:mm:ss'),
            timeLeft: `${hours}h ${minutes}m ${seconds}s`,
            quantity: updatedQuantity, // Quantidade de vouchers
            validity: validity // Tempo de validade
        });
    }

    res.status(400).json({
        message: "Não há voucher disponível!",
        expiresAt: "Não disponível",
        timeLeft: "Não disponível",
        quantity: quantity, // Quantidade de vouchers disponível
        validity: validity // Tempo de validade
    });
});

app.listen(3000, () => {
    console.log("Servidor rodando na porta 3000");
});
