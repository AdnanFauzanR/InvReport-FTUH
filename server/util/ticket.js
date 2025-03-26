function generateTicket() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const datePart = `${year}${month}${day}`;

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomPart = '';
    for (let i = 0; i < 5; i++ ) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const ticket = datePart + randomPart;

    return ticket;
}

module.exports = generateTicket;