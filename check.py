import requests
import json


def get_address_transactions(
        address: str,
        limit: int = 10,
        lt: int = None,
        hash_: str = None,
        to_lt: int = 0,
        archival: bool = False
):
    # Проверяем обязательные параметры
    if not address:
        raise ValueError("Address parameter is required")

    # Проверяем взаимосвязанные параметры
    if (lt is None) != (hash_ is None):
        raise ValueError("Both lt and hash parameters must be provided together")

    # Формируем параметры запроса
    params = {
        "address": address,
        "limit": limit,
        "to_lt": to_lt,
        "archival": str(archival).lower()
    }

    # Добавляем опциональные параметры
    if lt is not None:
        params["lt"] = lt
    if hash_ is not None:
        params["hash"] = hash_

    # Используем API TON Center
    url = "https://toncenter.com/api/v2/getTransactions"

    headers = {
        "accept": "application/json",
        "api-key": "85302de81875f298aaba39d90d706b88f5280e320793b380c8216d59f3cfcd2f"
    }

    try:
        response = requests.get(url, params=params, headers=headers)
        response.raise_for_status()
        data = response.json()

        # Проверяем статус ответа
        if not data.get("ok", False):
            print(f"API Error: {data.get('error', 'Unknown error')}")
            return None

        transactions = data.get("result", [])
        processed = []

        # Обрабатываем каждую транзакцию
        for tx in transactions:
            # Извлекаем основные данные
            tx_data = {
                "hash": tx.get("hash"),
                "lt": tx.get("lt"),
                "sender": tx.get("in_msg", {}).get("source"),
                "receiver": tx.get("in_msg", {}).get("destination"),
                "amount": int(tx.get("in_msg", {}).get("value", 0)) / 1e9,  # Конвертация наноТон → ТОН
                "timestamp": tx.get("utime"),
                "status": tx.get("success", False)
            }
            processed.append(tx_data)

        # Сохраняем в файл
        filename = f'transactions_{address}.json'
        with open(filename, 'w') as f:
            json.dump(processed, f, indent=2)

        return processed

    except requests.exceptions.RequestException as e:
        print(f"Request error: {e}")
    except Exception as e:
        print(f"Error processing data: {e}")


# Пример использования
if __name__ == "__main__":
    address = "EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N"

    transactions = get_address_transactions(
        address=address,
        limit=3,
        archival=False
    )

    if transactions:
        print(f"Found {len(transactions)} transactions")
        print(f"Data saved to transactions_{address}.json")
        for idx, tx in enumerate(transactions, 1):
            print(f"\nTransaction #{idx}:")
            print(f"Hash: {tx['hash']}")
            print(f"Sender: {tx['sender']}")
            print(f"Amount: {tx['amount']} TON")
            print(f"Timestamp: {tx['timestamp']}")