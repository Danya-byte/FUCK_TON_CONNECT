import requests
import json
import os
from datetime import datetime

API_KEY = "AHR6HJX5V6HNRSAAAAAP5ZBDDGMR5D3WYSHNYJRWPGEKSUIGG64KDNEHIUXJYRUN7GW3AAY"
BASE_URL = "https://tonapi.io"  # Основной URL для mainnet
SAVE_DIR = "transactions"  # Папка для сохранения файлов

# Создаем папку, если её нет
if not os.path.exists(SAVE_DIR):
    os.makedirs(SAVE_DIR)


def get_transaction_trace(trace_id: str) -> dict:
    """
    Получает информацию о транзакции по её trace ID или хэшу.

    Args:
        trace_id (str): Trace ID или хэш транзакции.

    Returns:
        dict: Данные транзакции в формате JSON.
    """
    url = f"{BASE_URL}/v2/traces/{trace_id}"  # Исправлен путь API
    headers = {
        "Authorization": f"Bearer {API_KEY}"
    }

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()  # Проверяем на ошибки HTTP
        return response.json()  # Возвращаем данные в формате JSON

    except requests.exceptions.RequestException as e:
        print(f"Ошибка запроса: {e}")
    except Exception as e:
        print(f"Ошибка при обработке данных: {e}")
    return None


def is_trace_success(trace: dict) -> dict:
    """
    Рекурсивно проверяет, была ли транзакция и её дочерние сообщения успешными.

    Args:
        trace (dict): Данные транзакции.

    Returns:
        dict: Результат проверки с указанием успешности и ошибки (если есть).
    """
    if not trace.get("transaction", {}).get("success", False):
        return {"isSuccess": False, "errorTransaction": trace["transaction"]}

    if trace.get("children"):  # Проверяем наличие дочерних транзакций
        for child in trace["children"]:
            result = is_trace_success(child)
            if not result["isSuccess"]:
                return result

    return {"isSuccess": True, "errorTransaction": None}


def save_transaction_to_file(trace_id: str, data: dict):
    """
    Сохраняет данные транзакции в файл JSON.

    Args:
        trace_id (str): Trace ID или хэш транзакции.
        data (dict): Данные транзакции.
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")  # Формат времени для имени файла
    filename = f"{SAVE_DIR}/{trace_id}_{timestamp}.json"  # Имя файла
    with open(filename, "w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=4)  # Сохраняем в формате JSON
    print(f"Данные транзакции сохранены в файл: {filename}")


# Пример использования
def get_transaction_amount(trace: dict) -> float:
    """
    Извлекает сумму перевода из данных транзакции и конвертирует её из наноTON в TON.

    Args:
        trace (dict): Данные транзакции.

    Returns:
        float: Сумма перевода в TON.
    """
    if trace.get("messages"):
        for message in trace["messages"]:
            if "value" in message:
                return message["value"] / 1e9  # Конвертируем наноTON в TON

    if trace.get("transfers"):
        for transfer in trace["transfers"]:
            if "value" in transfer:
                return transfer["value"] / 1e9  # Конвертируем наноTON в TON

    if trace.get("transaction", {}).get("value"):
        return trace["transaction"]["value"] / 1e9  # Конвертируем наноTON в TON

    return 0.0  # Если сумма не найдена


def get_sender_address(trace: dict) -> str:
    """
    Извлекает адрес отправителя из данных транзакции.

    Args:
        trace (dict): Данные транзакции.

    Returns:
        str: Адрес отправителя.
    """
    if trace.get("messages"):
        for message in trace["messages"]:
            if "source" in message:
                return message["source"]

    if trace.get("transfers"):
        for transfer in trace["transfers"]:
            if "from" in transfer:
                return transfer["from"]

    return "Unknown"  # Если адрес не найден


# Пример использования
if __name__ == "__main__":
    trace_id = "E8LbY9kJCgCfUsc9g7sjNylBLn3SexVA9Tco8wIL7Cg="  # Замените на реальный trace_id или хэш

    # Получаем данные о транзакции
    trace = get_transaction_trace(trace_id)
    if trace:
        # Извлекаем нужные данные
        sender_address = get_sender_address(trace)
        amount = get_transaction_amount(trace)
        status = "Успешно" if trace.get("transaction", {}).get("success", False) else "Ошибка"

        # Выводим данные в консоль
        print("Адрес отправителя:", sender_address)
        print("Сумма перевода (TON):", amount)
        print("Статус платежа:", status)
        print("Message:", )

        # Сохраняем данные в файл
        save_transaction_to_file(trace_id, trace)
    else:
        print("Не удалось получить данные о транзакции.")
