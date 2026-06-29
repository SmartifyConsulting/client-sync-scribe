const fs = require('fs');
const path = require('path');

const newKeysCommon = {
    "yes": "Yes",
    "no": "No",
    "ok": "OK",
    "pleaseWait": "Please wait...",
    "tryAgain": "Try again",
    "success": "Success",
    "warning": "Warning"
};

const newKeysStructure = {
    "dialogs": {
        "confirm": "Confirm",
        "confirmDelete": "Are you sure you want to delete this?",
        "confirmAction": "Are you sure?",
        "warning": "Warning",
        "error": "Error",
        "success": "Success",
        "deleteItem": "Delete",
        "deleteConfirm": "This action cannot be undone.",
        "cancel": "Cancel",
        "ok": "OK"
    },
    "forms": {
        "labels": {
            "name": "Name",
            "email": "Email Address",
            "password": "Password",
            "phone": "Phone Number",
            "address": "Address",
            "zipCode": "ZIP Code",
            "country": "Country",
            "state": "State/Province"
        },
        "placeholders": {
            "search": "Search...",
            "email": "Enter your email",
            "password": "Enter password",
            "name": "Full name",
            "phone": "Phone number",
            "message": "Type your message..."
        },
        "validation": {
            "required": "This field is required",
            "email": "Please enter a valid email address",
            "minLength": "Minimum {min} characters required",
            "maxLength": "Maximum {max} characters allowed",
            "passwordMatch": "Passwords do not match",
            "invalidFormat": "Invalid format"
        }
    },
    "components": {
        "table": {
            "noData": "No data available",
            "loading": "Loading...",
            "rowsPerPage": "Rows per page",
            "of": "of"
        },
        "pagination": {
            "next": "Next",
            "previous": "Previous",
            "first": "First",
            "last": "Last",
            "page": "Page"
        },
        "empty": {
            "noItems": "No items found",
            "noResults": "No results",
            "tryAgain": "Try again"
        }
    },
    "messages": {
        "loading": "Loading...",
        "error": "An error occurred",
        "success": "Operation successful",
        "warning": "Warning",
        "info": "Information",
        "noConnection": "No internet connection",
        "tryAgain": "Try again",
        "pleaseWait": "Please wait..."
    }
};

const localeDir = path.join(__dirname, 'src/i18n/locales');
const files = fs.readdirSync(localeDir).filter(f => f.endsWith('.json'));

console.log(`Updating ${files.length} language files...`);

files.forEach(file => {
    const filePath = path.join(localeDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    // Add to common
    if (!data.common) data.common = {};
    Object.assign(data.common, newKeysCommon);
    
    // Add new top-level keys
    Object.assign(data, newKeysStructure);
    
    // Write back
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf-8');
    console.log(`✓ ${file}`);
});

console.log('\nAll language files updated successfully!');
