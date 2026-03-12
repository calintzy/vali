// fixture: 불필요한 Strategy 패턴
interface PaymentStrategy {
  pay(amount: number): void;
}

class CreditCardPayment implements PaymentStrategy {
  pay(amount: number): void {
    console.log(`Credit card: ${amount}`);
  }
}

// 구현체가 1개뿐인 Strategy → VAL005 감지 대상
