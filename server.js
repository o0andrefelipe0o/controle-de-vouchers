const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const moment = require('moment');

app.use(cors());
app.use(bodyParser.json());

let vouchers = [
    "94742-17376",
    "87263-29237",
    "36473-85322",
    // ... adicione os outros vouchers aqui
];

let activeVoucher = null;
let voucherTime = null;

app.get('/getVoucher', (req, res) => {
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
        activeVoucher = vouchers.pop();  // Retira um voucher da lista
        voucherTime = moment().add(2, 'hours');  // Define o tempo de validade do voucher
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
