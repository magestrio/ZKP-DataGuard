import { Bool, Field, Poseidon, Provable, Struct } from 'o1js';

type HashableProvable<T> = Provable<T> & {
  hash(x: T): Field;
  equals(x: T, other: T): Bool;
};

function hashable<T>(type: Provable<T>): HashableProvable<T> {
  return {
    ...type,
    hash(x: T): Field {
      return Poseidon.hash(type.toFields(x));
    },
    equals(x: T, other: T): Bool {
      return this.hash(x).equals(this.hash(other));
    },
  };
}

function HashMap<K, V>(key: Provable<K>, value: Provable<V>, size: number) {
  const _keyType = hashable(key);
  const _valueType = hashable(value);

  function ValueNull() {
    return _valueType.fromFields(
      Array(_valueType.sizeInFields()).fill(Field(0)),
      _valueType.toAuxiliary()
    );
  }

  function KeyNull() {
    return _keyType.fromFields(
      Array(_valueType.sizeInFields()).fill(Field(0)),
      _valueType.toAuxiliary()
    );
  }

  class MyKeyValue extends KeyValue(_keyType, _valueType) {}

  return class _HashMap extends Struct({
    values: Provable.Array(MyKeyValue, size),
  }) {
    constructor(entries: MyKeyValue[] = []) {
      super({
        values: entries,
      });
    }

    getKeys(): K[] {
      return this.values.map((entry) => entry.key);
    }

    getValues(): V[] {
      return this.values.map((entry) => entry.value);
    }

    put(key: K, value: V): Bool {
      const index = this.values.findIndex((value) =>
        _keyType.equals(value.key, key)
      );
      return Provable.if(
        Field(index).equals(-1),
        Bool(false),
        this.set(key, value, index)
      );
    }

    delete(key: K): Bool {
      const index = this.values.findIndex((value) =>
        _keyType.equals(value.key, key)
      );
      return Provable.if(
        Field(index).equals(-1),
        Bool(false),
        this.set(KeyNull(), ValueNull(), index)
      );
    }

    get(key: K): V {
      const index = this.values.findIndex((value) =>
        _keyType.equals(value.key, key)
      );

      return Provable.if(
        Field(index).equals(-1),
        _valueType,
        this.values[index].value,
        ValueNull()
      );
    }

    has(key: K): Bool {
      const index = this.values.findIndex((value) =>
        _keyType.equals(value.key, key)
      );

      return Provable.if(Field(index).equals(-1), Bool(false), Bool(true));
    }

    size(): number {
      return this.values.length;
    }

    private set(key: K, value: V, index: number): Bool {
      const entry = this.values[index];
      entry.key = key;
      entry.value = value;

      return Bool(true);
    }

    hash(): Field {
      return Poseidon.hash(
        this.values
          .map((entry) =>
            Poseidon.hash(
              _keyType.toFields(entry.key).concat(_valueType.toFields(entry.value))
            )
          )
          .flat()
      );
    }
  };
}

function KeyValue<K, V>(key: HashableProvable<K>, value: HashableProvable<V>) {
  return class _KeyValue extends Struct({
    key,
    value,
  }) {};
}
