import hashlib
import time
from typing import List, Dict

class Block:
    def __init__(self, index: int, timestamp: float, sender: str, receiver: str, amount: float, previous_hash: str):
        self.index = index
        self.timestamp = timestamp
        self.sender = sender
        self.receiver = receiver
        self.amount = amount
        self.previous_hash = previous_hash
        self.hash = self.calculate_hash()

    def calculate_hash(self) -> str:
        block_string = f"{self.index}{self.timestamp}{self.sender}{self.receiver}{self.amount}{self.previous_hash}"
        return hashlib.sha256(block_string.encode()).hexdigest()

    def to_dict(self) -> Dict:
        return {
            'index': self.index,
            'timestamp': self.timestamp,
            'sender': self.sender,
            'receiver': self.receiver,
            'amount': self.amount,
            'previous_hash': self.previous_hash,
            'hash': self.hash
        }

class Blockchain:
    def __init__(self):
        self.chain: List[Block] = [self.create_genesis_block()]
        self.balances: Dict[str, float] = {}

    def create_genesis_block(self) -> Block:
        return Block(0, time.time(), "Genesis", "Genesis", 0, "0")

    def get_last_block(self) -> Block:
        return self.chain[-1]

    def add_payment(self, sender: str, receiver: str, amount: float) -> Block:
        # Verifica si el remitente tiene saldo suficiente (excepto el bloque génesis)
        if sender != "Genesis" and self.balances.get(sender, 0) < amount:
            raise ValueError(f"Saldo insuficiente para {sender}")
        last_block = self.get_last_block()
        new_block = Block(
            index=len(self.chain),
            timestamp=time.time(),
            sender=sender,
            receiver=receiver,
            amount=amount,
            previous_hash=last_block.hash
        )
        self.chain.append(new_block)
        # Actualiza saldos
        if sender != "Genesis":
            self.balances[sender] = self.balances.get(sender, 0) - amount
        self.balances[receiver] = self.balances.get(receiver, 0) + amount
        return new_block

    def get_balance(self, user: str) -> float:
        return self.balances.get(user, 0)

    def is_chain_valid(self) -> bool:
        for i in range(1, len(self.chain)):
            current = self.chain[i]
            previous = self.chain[i-1]
            if current.hash != current.calculate_hash():
                return False
            if current.previous_hash != previous.hash:
                return False
        return True

    def to_list(self) -> List[Dict]:
        return [block.to_dict() for block in self.chain]

# Ejemplo de uso
if __name__ == "__main__":
    blockchain = Blockchain()
    # Inicializa saldo de Alice con un pago desde 'Genesis'
    blockchain.add_payment("Genesis", "Alice", 200)
    blockchain.add_payment("Alice", "Bob", 50)
    blockchain.add_payment("Bob", "Charlie", 20)
    print("Saldos:")
    for user in ["Alice", "Bob", "Charlie"]:
        print(f"{user}: {blockchain.get_balance(user)}")
    print("\nCadena de bloques:")
    for block in blockchain.to_list():
        print(block)
    print("¿Cadena válida?", blockchain.is_chain_valid())
