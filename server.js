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
    const lines = data.split('\n').map(line => line.trim());
    const validity = lines[0];  // Tempo de validade do voucher (primeira linha)
    const vouchers = lines.slice(1);  // Vouchers (linhas subsequentes)

    return {
        validity,
        vouchers
    };
}

// Função para salvar os vouchers no arquivo 'vouchers.txt'
function saveVouchersToFile(validity, vouchers) {
    const data = [validity, ...vouchers].join('\n');
    fs.writeFileSync('vouchers.txt', data, 'utf-8');
}

let activeVoucher = null;
let voucherTime = null;
let voucherValidity = null;

app.get('/getVoucher', (req, res) => {
    // Lê os vouchers e a validade do arquivo
    const { validity, vouchers } = readVouchersFile();
    
    if (!voucherValidity) {
        voucherValidity = validity;  // Define o tempo de validade global para o primeiro uso
    }

    if (activeVoucher && moment().isBefore(voucherTime)) {
        // Se houver um voucher ativo e o tempo não passou
        let timeLeft = moment(voucherTime).diff(moment(), 'seconds');
        let hours = Math.floor(timeLeft / 3600);
        let minutes = Math.floor((timeLeft % 3600) / 60);
        let seconds = timeLeft % 60;

        return res.status(400).json({
            message: "Você ainda tem um voucher ativo!",
            voucher: activeVoucher,
            timeLeft: `${hours}h ${minutes}m ${seconds}s`
        });
    }

    // Pega o próximo voucher da lista
    if (vouchers.length > 0) {
        activeVoucher = vouchers.pop();  // Retira o último voucher da lista
        voucherTime = moment().add(moment.duration(voucherValidity));  // Define o tempo de validade do voucher
        saveVouchersToFile(voucherValidity, vouchers);  // Atualiza o arquivo removendo o voucher retirado
        return res.json({
            message: "Voucher gerado com sucesso!",
            voucher: activeVoucher,
            expiresAt: voucherTime.format('DD/MM/YYYY [às] HH:mm:ss')
        });
    }

    res.status(400).json({ message: "Nenhum voucher disponível!" });
});

app.listen(3000, () => {
    console.log("Servidor rodando na porta 3000");
});
