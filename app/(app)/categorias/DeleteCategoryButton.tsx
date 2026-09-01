"use client";

import { Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { deleteCategory } from "./actions";

function DeleteButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      title={
        disabled
          ? "Categoria em uso por transações — não pode ser excluída"
          : "Excluir categoria"
      }
      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-negative-soft hover:text-negative disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted"
    >
      <Trash2 size={16} />
    </button>
  );
}

export default function DeleteCategoryButton({
  categoryId,
  categoryName,
  disabled,
}: {
  categoryId: string;
  categoryName: string;
  disabled: boolean;
}) {
  return (
    <form
      action={deleteCategory}
      onSubmit={(e) => {
        if (!confirm(`Excluir a categoria "${categoryName}"?`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="categoryId" value={categoryId} />
      <DeleteButton disabled={disabled} />
    </form>
  );
}
