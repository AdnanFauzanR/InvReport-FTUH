// Function utama untuk memproses list
function processListWithStatus(listX, listY, lastStatusIndex) {
    console.log('=== INPUT ===');
    console.log('List X:', listX);
    console.log('List Y:', listY);
    console.log('Last Status Index:', lastStatusIndex, '(', listX[lastStatusIndex], ')');
    console.log('ATURAN: Last status selalu di index 0');
    console.log('');
    
    // Step 1: Cek apakah ada urutan berurutan dari awal di list Y
    const sequentialInfo = checkSequentialFromStart(listX, listY);
    
    // Step 2: Tentukan new last status berdasarkan aturan
    let newLastStatusValue;
    
    if (sequentialInfo.isSequential) {
        // Jika ada urutan berurutan dari awal, last status adalah elemen setelah urutan berurutan
        const afterSequentialIndex = sequentialInfo.sequentialLength;
        newLastStatusValue = listX[afterSequentialIndex];
        console.log(`🔄 Ada urutan berurutan 0-${sequentialInfo.sequentialLength-1}, last status menjadi ${newLastStatusValue}`);
    } else {
        // Jika tidak ada urutan berurutan, cek apakah last_status akan dihapus
        const currentLastStatusValue = listX[lastStatusIndex];
        if (listY.includes(currentLastStatusValue)) {
            // Last status akan dihapus, cari elemen setelahnya yang tidak dihapus
            newLastStatusValue = findNextNonDeletedElement(listX, listY, lastStatusIndex);
            console.log(`🔄 Last status (${currentLastStatusValue}) akan dihapus, pindah ke ${newLastStatusValue}`);
        } else {
            // Last status tidak dihapus, tetap sama
            newLastStatusValue = currentLastStatusValue;
            console.log(`✅ Last status (${currentLastStatusValue}) tidak dihapus, tetap sama`);
        }
    }
    
    // Step 3: Hapus elemen dari list X
    const newListX = listX.filter(element => !listY.includes(element));
    
    // Step 4: Arrange list baru sehingga last status berada di index 0
    const arrangedListX = arrangeListWithStatusAtZero(newListX, newLastStatusValue);
    
    console.log('=== OUTPUT ===');
    console.log('New List X:', arrangedListX);
    console.log('New Last Status Index: 0 (', arrangedListX[0], ')');
    console.log('');
    
    return {
        newListX: arrangedListX,
        newLastStatusIndex: 0,
        newLastStatusValue: arrangedListX[0]
    };
}

// Helper function: Cek urutan berurutan dari awal
function checkSequentialFromStart(listX, listY) {
    const indexes = listY.map(element => listX.indexOf(element));
    
    let sequentialLength = 0;
    for (let i = 0; i < indexes.length; i++) {
        if (indexes[i] === i) {
            sequentialLength++;
        } else {
            break;
        }
    }
    
    const isSequential = sequentialLength > 0;
    
    if (isSequential) {
        console.log(`📊 Ditemukan urutan berurutan dari index 0 sampai ${sequentialLength-1}`);
    } else {
        console.log('📊 Tidak ada urutan berurutan dari awal');
    }
    
    return {
        isSequential: isSequential,
        sequentialLength: sequentialLength
    };
}

// Helper function: Cari elemen berikutnya yang tidak akan dihapus
function findNextNonDeletedElement(listX, listY, currentIndex) {
    // Cari dari index berikutnya
    for (let i = currentIndex + 1; i < listX.length; i++) {
        if (!listY.includes(listX[i])) {
            return listX[i];
        }
    }
    
    // Jika tidak ada elemen setelahnya, cari dari awal
    for (let i = 0; i < currentIndex; i++) {
        if (!listY.includes(listX[i])) {
            return listX[i];
        }
    }
    
    return null; // Tidak ada elemen yang tersisa
}

// Helper function: Arrange list sehingga status berada di index 0
function arrangeListWithStatusAtZero(listX, statusValue) {
    // Cari index dari status value
    const statusIndex = listX.indexOf(statusValue);
    
    if (statusIndex === -1) {
        console.log('❌ Status value tidak ditemukan di list!');
        return listX;
    }
    
    if (statusIndex === 0) {
        // Sudah di index 0
        return listX;
    }
    
    // Pindahkan status ke index 0
    const newList = [...listX];
    const statusElement = newList.splice(statusIndex, 1)[0];
    newList.unshift(statusElement);
    
    return newList;
}

// =================== TEST CASES ===================

console.log('🧪 TEST CASE 1: Ada urutan berurutan dari awal');
const X1 = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const Y1 = ['A', 'B', 'C', 'F', 'J']; // A,B,C berurutan (0,1,2)
const lastStatus1 = 0; // A (index 0)
// Expected: A,B,C dihapus → D jadi last status → list baru [D, E, G, H] dengan D di index 0
processListWithStatus(X1, Y1, lastStatus1);

console.log('=====================================');

console.log('🧪 TEST CASE 2: Last status akan dihapus, tidak ada urutan berurutan');
const X2 = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const Y2 = ['B', 'I', 'J']; // Tidak berurutan
const lastStatus2 = 0; // A (tidak dihapus, tetap di index 0)
// Expected: B,I,J dihapus → A tetap jadi last status → list baru [A, C, D, E, F, G, H]
processListWithStatus(X2, Y2, lastStatus2);

console.log('=====================================');

console.log('🧪 TEST CASE 3: Last status (bukan A) akan dihapus');
const X3 = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const Y3 = ['A', 'I', 'J']; // A akan dihapus
const lastStatus3 = 0; // A (akan dihapus)
// Expected: A,I,J dihapus → B jadi last status → list baru [B, C, D, E, F, G, H]
processListWithStatus(X3, Y3, lastStatus3);

console.log('=====================================');

console.log('🧪 TEST CASE 4: Urutan berurutan lebih panjang');
const X4 = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const Y4 = ['A', 'B', 'C', 'D', 'E', 'H']; // A,B,C,D,E berurutan (0,1,2,3,4)
const lastStatus4 = 0; // A
// Expected: A,B,C,D,E,H dihapus → F jadi last status → list baru [F, G, I, J]
processListWithStatus(X4, Y4, lastStatus4);

console.log('=====================================');

console.log('🧪 TEST CASE 5: Last status di tengah, tidak dihapus');
const X5 = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const Y5 = ['B', 'I', 'J'];
const lastStatus5 = 0; // A (tidak dihapus)
// Expected: B,I,J dihapus → A tetap last status → list baru [A, C, D, E, F, G, H]
processListWithStatus(X5, Y5, lastStatus5);