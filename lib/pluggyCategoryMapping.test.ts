import { describe, expect, it } from "vitest";
import { encontrarCategoriaCorrespondente } from "./pluggyCategoryMapping";

describe("encontrarCategoriaCorrespondente", () => {
  it("matches by direct word overlap", () => {
    const categorias = [
      { id: "1", nome: "Restaurante" },
      { id: "2", nome: "Supermercado" },
    ];
    const resultado = encontrarCategoriaCorrespondente(
      "Restaurantes, bares e lanchonetes",
      categorias,
    );
    expect(resultado?.id).toBe("1");
  });

  it("matches via the synonym table when wording differs", () => {
    const categorias = [
      { id: "1", nome: "Combustível" },
      { id: "2", nome: "Restaurante" },
    ];
    const resultado = encontrarCategoriaCorrespondente(
      "Postos de gasolina",
      categorias,
    );
    expect(resultado?.id).toBe("1");
  });

  it("matches car-related categories via the transporte/carro synonym group", () => {
    const categorias = [
      { id: "1", nome: "Carro" },
      { id: "2", nome: "Saúde" },
    ];
    const resultado = encontrarCategoriaCorrespondente(
      "Táxi e transporte privado urbano",
      categorias,
    );
    expect(resultado?.id).toBe("1");
  });

  it("returns null when nothing reasonably matches", () => {
    const categorias = [
      { id: "1", nome: "Restaurante" },
      { id: "2", nome: "Supermercado" },
    ];
    const resultado = encontrarCategoriaCorrespondente(
      "Cinema, teatro e concertos",
      categorias,
    );
    expect(resultado).toBeNull();
  });

  it("returns null for an empty candidate list", () => {
    const resultado = encontrarCategoriaCorrespondente("Restaurante", []);
    expect(resultado).toBeNull();
  });

  it("picks the category with the highest keyword overlap", () => {
    const categorias = [
      { id: "1", nome: "Saúde" },
      { id: "2", nome: "Farmácia e Saúde" },
    ];
    const resultado = encontrarCategoriaCorrespondente(
      "Farmácia",
      categorias,
    );
    expect(resultado?.id).toBe("2");
  });

  it("is accent- and case-insensitive", () => {
    const categorias = [{ id: "1", nome: "SUPERMERCADO" }];
    const resultado = encontrarCategoriaCorrespondente("mercado", categorias);
    expect(resultado?.id).toBe("1");
  });
});
